from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import requests
import os
from django.core.cache import cache

def _get_erp_url():
    """Returns the cleaned ERP API URL from env or default."""
    url = os.getenv('ERP_API_URL') or 'https://pfndrerp.in'
    return url.strip().rstrip('/')

def debug_log(msg):
    log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'erp_debug.log')
    try:
        with open(log_path, 'a') as f:
            f.write(f"{msg}\n")
    except:
        pass

def _get_erp_admin_token(force_refresh=False):
    """
    Resilient admin token fetch. 
    Intentionally uses a longer timeout specifically for the login handshake.
    """
    cache_key = 'erp_admin_auth_token_v6'
    
    if not force_refresh:
        token = cache.get(cache_key)
        if token:
            debug_log("[TOKEN] Serving token from cache")
            return token

    # CRITICAL: These must be set in Render dashboard environment variables!
    erp_url = _get_erp_url()
    admin_email = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
    admin_pass = os.getenv('ERP_ADMIN_PASSWORD', '000000')

    debug_log(f"[TOKEN] Attempting login for {admin_email} at {erp_url}")
    try:
        # 60s timeout — Render-hosted ERP has long cold-start wake times
        resp = requests.post(
            f"{erp_url}/api/superAdmin/login",
            json={"email": admin_email, "password": admin_pass},
            timeout=60
        )
        debug_log(f"[TOKEN] Login response status: {resp.status_code}")
        if resp.status_code == 200:
            token = resp.json().get('token')
            if token:
                debug_log("[TOKEN] Token obtained successfully")
                cache.set(cache_key, token, 86400) # 24 Hours
                return token
        else:
            debug_log(f"[TOKEN] Login failed: {resp.status_code} - {resp.text[:100]}")
    except Exception as e:
        debug_log(f"[TOKEN] Login exception: {e}")
    return None

def _is_profile_rich(data):
    """Checks if the given ERP data contains actual profile details beyond placeholders."""
    if not isinstance(data, dict): return False
    
    # Check for direct 'student' object (Strategy 1/2 shape) 
    # OR check if it has 'studentsDetails' (Login cache shape)
    details = data.get('student', {}).get('studentsDetails', [])
    if not details and isinstance(data.get('studentsDetails'), list):
        details = data['studentsDetails']

    if not details: return False
    d = details[0]
    
    # Check if we have real values for key fields
    # We ignore placeholders like '—', 'Loading...', 'Student', or empty strings
    check_fields = ['mobileNum', 'studentName', 'schoolName', 'address']
    real_count = 0
    for field in check_fields:
        val = str(d.get(field) or '').strip()
        if val and val not in ['—', 'Loading...', 'Student', 'student', 'undefined', 'null', 'Syncing...']:
            real_count += 1
            
    # If we have at least 1 real field (e.g. Name), consider it decent enough to show
    # We previously required 2, but 1 is fine for a fast initial UI
    return real_count >= 1

def get_student_lookup_index(force_refresh=False):
    """
    Best Algorithm: O(1) Hash Map lookup instead of O(N) list iteration.
    Indexes all students by Email and Admission ID for instant retrieval.
    """
    index_key = 'erp_student_lookup_index_v1'
    
    if force_refresh:
        cache.delete(index_key)
        # We don't call the view, we just rely on get_all_students_erp_data view being called 
        # or we could move the logic to a helper.
    
    index = cache.get(index_key)
    if index and not force_refresh: return index
    
    # helper for mass data fetch (reused by view and here)
    bulk_cache = _fetch_all_students_erp(force_refresh=force_refresh)
    if not bulk_cache or not isinstance(bulk_cache, list): return None
    
    print(f"[ERP] O(1) Indexing {len(bulk_cache)} records for high-performance lookup...")
    idx = {}
    for record in bulk_cache:
        # Index by Admission Number
        adm_no = str(record.get('admissionNumber') or '').strip().upper()
        if adm_no: idx[f"adm_{adm_no}"] = record
        
        # Index by Student Emails
        details = record.get('student', {}).get('studentsDetails', [])
        for d in details:
            email = str(d.get('studentEmail') or '').strip().lower()
            if email:
                if f"email_{email}" not in idx: idx[f"email_{email}"] = record
                
    cache.set(index_key, idx, 3600) # 1 hour index life
    return idx

def _fetch_all_students_erp(force_refresh=False):
    CACHE_KEY = 'erp_all_students_v1'
    if not force_refresh:
        cached = cache.get(CACHE_KEY)
        if cached is not None: return cached

    try:
        erp_url = _get_erp_url()
        erp_token = _get_erp_admin_token(force_refresh=force_refresh)

        if not erp_token: return []

        print(f"[ERP SYNC] Fetching FRESH data for {CACHE_KEY} (Forced: {force_refresh})...")
        resp = requests.get(
            f"{erp_url}/api/admission",
            headers={"Authorization": f"Bearer {erp_token}"},
            timeout=90
        )

        if resp.status_code == 200:
            data = resp.json()
            final_data = []
            if isinstance(data, dict):
                final_data = data.get('data') or data.get('admissions') or data.get('students') or []
            elif isinstance(data, list):
                final_data = data
            
            if final_data:
                cache.set(CACHE_KEY, final_data, 86400)
                return final_data
    except Exception as e:
        print(f"[ERP SYNC ERROR] {e}")
    return []

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_erp_data(request):
    """
    Fast per-student ERP data lookup with multi-strategy resilience.
    Now optimized to filter rich data from mass records if local cache is thin.
    """
    user = request.user
    search_email = (user.email or user.username).strip().lower()
    search_username = user.username.strip().upper() 
    erp_url = _get_erp_url()
    force_refresh = request.GET.get('refresh') == 'true'

    # ── Quick Check: Strategy 1 - Individual Cache ─────────────────────────────
    student_cache_key = f"erp_student_data_v6_{user.pk}"
    lock_key = f"erp_sync_lock_{user.pk}"
    cached = cache.get(student_cache_key)
    
    # If forcing refresh, we keep 'cached' as a fallback if Strategy 3 fails
    # Do NOT delete yet to prevent UI Flickering
    if force_refresh:
        print(f"[ERP] Force Refresh Triggered for user {user.pk}. Parallel sync starting...")

    # If we have RICH cached data, and NOT forcing refresh, return it immediately
    if not force_refresh and _is_profile_rich(cached):
        print(f"[ERP] Strategy 1 HIT: serving {search_email} from cache.")
        return Response(cached, status=200)

    print(f"[ERP] O(1) Strategy Search Start for {search_email}...")

    # ── Strategy 2: Admin Bulk Cache Search (Global) ──────────────────────────
    # Removed the massive 17+ second synchronous fetch of all students. 
    # If the student is not in the individual cache, we skip straight to Strategy 3
    # which queries the ERP for their specific email address instead of the whole database.
    # ── Strategy 2: O(1) Hash Map Index Lookup ───────────────────────────────
    # We use a pre-built dictionary for constant time retrieval
    if not force_refresh:
        index = get_student_lookup_index()
        if index:
            print(f"[ERP] Strategy 2: Using Hash Map Index for {search_email}/{search_username}...")
            # Try lookup by Email then by Admission ID
            match = index.get(f"email_{search_email}") or index.get(f"adm_{search_username}")
            
            if match:
                print(f"[ERP] Strategy 2 SUCCESS: Found record via high-speed index.")
                _sync_user_to_erp(user, match)
                cache.set(student_cache_key, match, 300) # 5 Minute User Cache
                return Response(match, status=200)

    # If Strategy 1 and 2 failed, we have a choice:
    # 1. If this is a background/silent refresh (force_refresh=True), block and get fresh data.
    # 2. If this is the INITIAL load (force_refresh=False), return what we have (mock) FAST 
    #    and let the frontend trigger the enrichment silently.
    if not force_refresh:
        print(f"[ERP] O(1) Fast Return: Returning local profile to unblock UI. Background sync will follow.")
        # We skip straight to Strategy 4 for maximum responsiveness
        pass 
    else:
        # ── Strategy 3: Targeted API Call (Blocking for Force Refresh) ─────────────
        # Check if we are already fetching for this student to avoid Broken Pipe/Spam
        if cache.get(lock_key):
            if cached: return Response(cached, status=200)
            return Response({"status": "syncing", "message": "Enrichment in progress"}, status=202)

    # Strategy 3: Targeted Fetch
    # We prefer the Admin Token for enrichment (Strategy 3) because /api/admission 
    # often requires higher privileges than a standard student token holds.
    student_erp_token = cache.get(f"erp_token_{user.pk}")
    admin_token = _get_erp_admin_token()
    
    # If force refresh, we MUST use admin token to get a "God view" of the record
    if force_refresh:
        active_token = admin_token
        is_admin_sync = True
    else:
        # Otherwise try student token first, fallback to admin
        active_token = student_erp_token or admin_token
        is_admin_sync = not bool(student_erp_token)

    if active_token:
        cache.set(lock_key, True, 60) # 60s lock
        try:
            print(f"[ERP] Strategy 3: TARGETED fetch for {search_email} (Force: {force_refresh}, Admin: {is_admin_sync})...")
            target_record = None
            
            # Sub-Strategy 3a: Email Filter (Primary)
            try:
                resp = requests.get(f"{erp_url}/api/admission?studentEmail={search_email}", 
                                    headers={"Authorization": f"Bearer {active_token}"}, timeout=60)
                
                # Handle 401 Escallation
                if resp.status_code == 401 and not is_admin_sync and admin_token:
                    print(f"[ERP] 401 on student token. Escalating to Admin session for {search_email}...")
                    active_token = admin_token
                    is_admin_sync = True
                    resp = requests.get(f"{erp_url}/api/admission?studentEmail={search_email}", 
                                        headers={"Authorization": f"Bearer {active_token}"}, timeout=60)

                print(f"[ERP] Targeted Email Fetch Status: {resp.status_code}")
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list) and len(data) > 0: 
                        potential_record = data[0]
                    elif isinstance(data, dict):
                        # Handle wrapped response {message, student} or direct response {student, ...}
                        if data.get('student') and data.get('message'):
                            potential_record = data.get('student')
                        else:
                            potential_record = data
                    
                    if potential_record:
                        # VERIFY this is actually the right student
                        details = potential_record.get('student', {}).get('studentsDetails', [])
                        adm_num = str(potential_record.get('admissionNumber') or '').strip().upper()
                        email_match = any(d and str(d.get('studentEmail') or '').strip().lower() == search_email for d in details)
                        
                        if email_match or (search_username and adm_num == search_username):
                            target_record = potential_record
                            print(f"[ERP] Found verified record via email filter.")
                        else:
                            print(f"[ERP] Email filter returned non-matching record (expected {search_email}). Falling back...")
            except Exception as e: 
                print(f"[ERP] Email Filter fetch error: {e}")

            # Sub-Strategy 3b: Full Fetch (Resilient Fallback) - ONLY if email search failed
            if not target_record:
                print(f"[ERP] Strategy 3b: Email Targeted fail/mismatch, trying full fetch search...")
                resp = requests.get(f"{erp_url}/api/admission", 
                                    headers={"Authorization": f"Bearer {active_token}"}, timeout=120)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict):
                         # Handle wrapped response here too just in case
                         if data.get('student') and data.get('message'):
                            potential_record = data.get('student')
                            # Check match
                            details = potential_record.get('student', {}).get('studentsDetails', [])
                            if any(d and str(d.get('studentEmail') or '').strip().lower() == search_email for d in details):
                                target_record = potential_record
                         elif data.get('student'):
                            target_record = data
                    elif isinstance(data, list):
                        print(f"[ERP] Searching through {len(data)} records for match...")
                        for admission in data:
                            details = admission.get('student', {}).get('studentsDetails', [])
                            admission_num = str(admission.get('admissionNumber') or '').strip().upper()
                            if any(d and str(d.get('studentEmail') or '').strip().lower() == search_email for d in details) or \
                               (search_username and admission_num == search_username):
                                target_record = admission
                                break
            
            if target_record:
                print(f"[ERP] Strategy 3 SUCCESS: Fresh record obtained for {search_email}.")
                # Add a metadata flag to indicate fresh sync
                target_record['sync_completed'] = True
                _sync_user_to_erp(user, target_record)
                cache.set(student_cache_key, target_record, 300)
                return Response(target_record, status=200)
            else:
                print(f"[ERP] Strategy 3 FAILED: Record for {search_email} not found in targeted search.")
        except Exception as e:
            print(f"[ERP ERROR] Strategy 3 failed: {e}")
        finally:
            cache.delete(lock_key)
    
    # If we got here, it's either an initial load OR Strategy 3 failed
    if not force_refresh:
         print(f"[ERP] Strategy 2 MISS: No cached record for {search_email}. Returning fast pending state.")
    else:
         print(f"[ERP] Strategy 3 FAIL: Could not enrich {search_email} via API.")
    if cached:
        print(f"[ERP] Strategy 4: Serving best available cached data.")
        return Response(cached, status=200)

    print(f"[ERP] Strategy 4: Returning local mock (Sync Pending).")
    local_data = {
        "admissionNumber": user.username,
        "sectionAllotment": { "examSection": user.exam_section or "—", "studySection": user.study_section or "—", "omrCode": user.omr_code or "—", "rm": user.rm_code or "—" },
        "student": { "studentsDetails": [{ "studentEmail": user.email or search_email, "studentName": f"{user.first_name} {user.last_name}".strip() or "Student", "mobileNum": "—", "schoolName": "Syncing...", "board": "—" }], "guardians": [], "examSchema": [] },
        "course": { "courseName": "—", "courseSession": "—", "mode": "—" },
        "is_offline": True, "sync_status": "pending"
    }
    return Response(local_data, status=200)


def _sync_user_to_erp(user, admission_data):
    """Updates local user fields with fresh data from ERP."""
    if not isinstance(admission_data, dict): return
    
    try:
        has_changed = False
        
        # 0. Sync Admission Number
        new_adm = admission_data.get('admissionNumber')
        if user.admission_number != new_adm:
            user.admission_number = new_adm; has_changed = True

        # 1. Sync Section/Codes
        sec = admission_data.get('sectionAllotment', {})
        if isinstance(sec, dict):
            new_es = sec.get('examSection')
            new_ss = sec.get('studySection')
            new_omr = sec.get('omrCode')
            new_rm = sec.get('rm')
            
            if user.exam_section != new_es: user.exam_section = new_es; has_changed = True
            if user.study_section != new_ss: user.study_section = new_ss; has_changed = True
            if user.omr_code != new_omr: user.omr_code = new_omr; has_changed = True
            if user.rm_code != new_rm: user.rm_code = new_rm; has_changed = True
        
        # 2. Sync Names
        details_list = admission_data.get('student', {}).get('studentsDetails', [])
        if details_list and isinstance(details_list, list) and len(details_list) > 0:
            details = details_list[0]
            name = details.get('studentName', '')
            if name:
                parts = name.strip().split(' ')
                f_name = parts[0]
                l_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
                if user.first_name != f_name: user.first_name = f_name; has_changed = True
                if user.last_name != l_name: user.last_name = l_name; has_changed = True
        
        # 3. Sync Centre Info
        venue = admission_data.get('venue') or admission_data.get('centre')
        if venue:
            new_cc = None
            new_cn = None
            if isinstance(venue, dict):
                new_cc = venue.get('centreCode') or venue.get('code')
                new_cn = venue.get('centreName') or venue.get('name')
            else:
                new_cn = str(venue)
                
            if user.centre_code != new_cc: user.centre_code = new_cc; has_changed = True
            if user.centre_name != new_cn: user.centre_name = new_cn; has_changed = True

        if has_changed:
            user.save()
            print(f"[SYNC] ✓ User {user.username} updated and saved.")
        else:
            print(f"[SYNC] ℹ User {user.username} already up to date.")
    except Exception as e:
        print(f"[SYNC] ⚠ Failed to sync user {user.username}: {e}")

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_students_erp_data(request):
    # Serve from cache unless a forced refresh is requested
    force_refresh = request.GET.get('refresh') in ['true', '1', 'True']
    data = _fetch_all_students_erp(force_refresh=force_refresh)
    return Response(data, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_centres_erp_data(request):
    CACHE_KEY = 'erp_all_centres_v1'
    force_refresh = request.GET.get('refresh') in ['true', '1', 'True']
    
    if not force_refresh:
        cached = cache.get(CACHE_KEY)
        if cached is not None:
            return Response(cached, status=200)

    try:
        erp_url = _get_erp_url()
        erp_token = _get_erp_admin_token()
        
        if not erp_token:
            print("[ERP ERROR] Admin token unavailable for centres")
            return Response([], status=200)

        # Added timeout to prevent hanging the server
        resp = requests.get(f"{erp_url}/api/centre", headers={"Authorization": f"Bearer {erp_token}"}, timeout=30)
        
        if resp.status_code == 401:
            erp_token = _get_erp_admin_token(force_refresh=True)
            resp = requests.get(f"{erp_url}/api/centre", headers={"Authorization": f"Bearer {erp_token}"}, timeout=30)
            
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, dict):
                data = data.get('data') or data.get('centres') or data
            
            raw_data = data if isinstance(data, list) else [data]
            
            # Deduplicate by enterCode or code to prevent UI duplication
            seen_codes = set()
            final_data = []
            for item in raw_data:
                if not isinstance(item, dict): continue
                # Identify by enterCode (priority) or fallback to name/address hash if code missing
                code = item.get('enterCode') or item.get('code')
                if not code:
                    # Create a simple hash-like key from name and city/state if no code
                    code = f"{item.get('centreName')}_{item.get('state')}"
                
                if code and code not in seen_codes:
                    final_data.append(item)
                    seen_codes.add(code)
            
            if final_data:
                cache.set(CACHE_KEY, final_data, 86400) # 24 Hours
            return Response(final_data, status=200)

        return Response([], status=200)
    except Exception as e:
        print(f"[ERP ERROR] get_all_centres_erp_data: {e}")
        return Response([], status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_teachers_erp_data(request):
    CACHE_KEY = 'erp_all_teachers_v6'
    debug_log(f"--- Request at {request.path} ---")
    
    # Serve from cache unless forced refresh requested
    force_refresh = request.GET.get('refresh') in ['true', '1', 'True']
    if not force_refresh:
        cached = cache.get(CACHE_KEY)
        if cached is not None:
            print(f"[ERP DEBUG] Serving {len(cached)} teachers from cache.")
            return Response(cached, status=200)

    try:
        erp_url = _get_erp_url()
        erp_token = _get_erp_admin_token()
        
        if not erp_token:
            debug_log("Admin token unavailable")
            return Response([], status=200)

        # 1. Fetch from Student Portal Teachers list
        teacher_list = []
        try:
            t_url = f"{erp_url}/api/student-portal/teachers?limit=1000"
            t_resp = requests.get(t_url, headers={"Authorization": f"Bearer {erp_token}"}, timeout=20)
            if t_resp.status_code == 200:
                data = t_resp.json()
                teacher_list = data if isinstance(data, list) else (data.get('teachers') or data.get('data') or [])
                debug_log(f"Fetched {len(teacher_list)} from student-portal/teachers")
        except Exception as e:
            debug_log(f"Error fetching teachers list: {e}")

        # 2. Fetch from HR Employees list (for Employee IDs)
        emp_lookup = {}
        try:
            e_url = f"{erp_url}/api/hr/employee?limit=1000"
            e_resp = requests.get(e_url, headers={"Authorization": f"Bearer {erp_token}"}, timeout=20)
            if e_resp.status_code == 200:
                data = e_resp.json()
                e_list = data if isinstance(data, list) else (data.get('employees') or data.get('data') or [])
                for emp in e_list:
                    uid = (emp.get('user', {}) or {}).get('_id')
                    eid = emp.get('employeeId')
                    if uid and eid:
                        emp_lookup[str(uid)] = str(eid)
                debug_log(f"Fetched {len(e_list)} from hr/employee, mapped {len(emp_lookup)} IDs")
        except Exception as e:
            debug_log(f"Error fetching employee list: {e}")

        # Use whichever list we got, prioritizing teacher_list if both available
        raw_list = teacher_list if teacher_list else []
        # If teacher_list is empty, maybe try e_list filtered by role?
        # But for now, let's just stick to merging if teacher_list exists.

        if len(raw_list) == 0 and teacher_list is None: # Fallback if first failed
             # (This part is handled by the teacher_list check above)
             pass

        if len(raw_list) > 0:
            final_data = []
            
            def _safe_str(val):
                if not val: return ""
                if isinstance(val, dict):
                    return val.get('name') or val.get('centreName') or val.get('departmentName') or str(val)
                return str(val)

            for item in raw_list:
                try:
                    # Meta info extraction
                    user_meta = item.get('user_meta') or item.get('user') or {}
                    if not isinstance(user_meta, dict): user_meta = {}
                    
                    academic = item.get('academicInfo', {}) or {}
                    gender = academic.get('gender', '')
                    emp_type = academic.get('employmentType', '')
                    
                    # Merge ID from lookup
                    emp_id_from_hr = emp_lookup.get(str(item.get('_id')))
                    
                    # Comprehensive ID search
                    emp_id = (
                        emp_id_from_hr or
                        item.get('employeeId') or 
                        item.get('employee_id') or 
                        item.get('id') or
                        item.get('empId') or
                        item.get('emp_id') or
                        item.get('code') or 
                        item.get('staffId') or
                        item.get('teacherId') or
                        item.get('facultyId') or
                        item.get('admissionNumber') or
                        item.get('admission_number') or
                        item.get('regNo') or
                        item.get('username') or 
                        item.get('userName') or 
                        user_meta.get('username') or 
                        user_meta.get('userName') or 
                        user_meta.get('userId') or 
                        academic.get('employeeId') or
                        academic.get('employee_id') or
                        academic.get('empId')
                    )

                    # Scan for EMP pattern if still no ID
                    if not emp_id:
                        for k, v in item.items():
                            if isinstance(v, str) and v.strip().upper().startswith('EMP'):
                                emp_id = v.strip(); break
                        if not emp_id and isinstance(user_meta, dict):
                            for k, v in user_meta.items():
                                if isinstance(v, str) and v.strip().upper().startswith('EMP'):
                                    emp_id = v.strip(); break

                    if not emp_id:
                        emp_id = (str(item.get('_id'))[-6:].upper() if item.get('_id') else 'N/A')

                    # Mapping other fields
                    name = item.get('name') or item.get('teacherName') or user_meta.get('name') or 'Unknown'
                    subject = _safe_str(user_meta.get('subject') or item.get('subject') or user_meta.get('teacherDepartment') or item.get('department') or item.get('teacherDepartment') or 'General')
                    dept = _safe_str(user_meta.get('teacherDepartment') or item.get('department') or item.get('teacherDepartment') or 'Academic')
                    desig = _safe_str(user_meta.get('designation') or item.get('designation') or 'Faculty')
                    
                    raw_centres = item.get('centres') or user_meta.get('centres') or []
                    if not raw_centres and item.get('primaryCentre'):
                        raw_centres = [item.get('primaryCentre')]
                    centres = [_safe_str(c) for c in raw_centres]
                    
                    t_type = _safe_str(item.get('typeOfEmployment') or item.get('teacherType') or user_meta.get('teacherType') or emp_type or 'Full-Time')

                    final_data.append({
                        'id': str(item.get('_id') or item.get('id') or ''),
                        'name': _safe_str(name),
                        'email': str(item.get('email') or user_meta.get('email') or '').strip().lower(),
                        'phone': str(item.get('mobNum') or item.get('phoneNumber') or item.get('mobileNum') or ''),
                        'subject': subject,
                        'subject_name': subject,
                        'code': str(emp_id),
                        'qualification': t_type,
                        'teacherType': t_type,
                        'centres': centres,
                        'teacherDepartment': dept,
                        'boardType': _safe_str(item.get('boardType') or user_meta.get('boardType') or 'NEET/JEE'),
                        'designation': desig,
                        'isDeptHod': bool(item.get('isDeptHod') or user_meta.get('isDeptHod')),
                        'isBoardHod': bool(item.get('isBoardHod') or user_meta.get('isBoardHod')),
                        'isSubjectHod': bool(item.get('isSubjectHod') or user_meta.get('isSubjectHod')),
                        'academicInfo': {
                            'joiningDate': _safe_str(item.get('dateOfJoining') or academic.get('joiningDate')),
                            'employmentType': _safe_str(item.get('typeOfEmployment') or academic.get('employmentType')),
                            'gender': _safe_str(item.get('gender') or academic.get('gender'))
                        }
                    })
                except Exception as e_item:
                    debug_log(f"Error mapping item: {e_item}")

            debug_log(f"Successfully parsed {len(final_data)} teacher records")
            # Cache for 24 hours
            cache.set(CACHE_KEY, final_data, 86400)
            return Response(final_data, status=200)

        debug_log("All endpoints failed or no response")
        return Response([], status=200)

    except Exception as e:
        debug_log(f"OUTER EXCEPTION: {e}")
        return Response([], status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_attendance(request):
    try:
        erp_url = _get_erp_url()
        erp_token = cache.get(f"erp_token_{request.user.pk}")
        resp = requests.get(f"{erp_url}/api/student-portal/attendance", headers={"Authorization": f"Bearer {erp_token}"}, timeout=20)
        return Response(resp.json() if resp.status_code == 200 else [], status=200)
    except: return Response([], status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_classes(request):
    try:
        erp_url = _get_erp_url()
        erp_token = cache.get(f"erp_token_{request.user.pk}")
        resp = requests.get(f"{erp_url}/api/student-portal/classes", headers={"Authorization": f"Bearer {erp_token}"}, timeout=20)
        return Response(resp.json() if resp.status_code == 200 else [], status=200)
    except: return Response([], status=200)
