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
    details = data.get('student', {}).get('studentsDetails', [])
    if not details: return False
    d = details[0]
    
    # Check if we have real values for key fields
    # We ignore placeholders like '—', 'Loading...', 'Student', or empty strings
    check_fields = ['mobileNum', 'studentName', 'schoolName', 'address']
    real_count = 0
    for field in check_fields:
        val = str(d.get(field) or '').strip()
        if val and val not in ['—', 'Loading...', 'Student', 'student', 'undefined', 'null']:
            real_count += 1
            
    # If we have at least 2 real fields (e.g. Name + Mobile or Name + School), consider it rich
    return real_count >= 2

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
    
    # If forcing refresh, clear the existing cache first
    if force_refresh:
        print(f"[ERP] Force Refresh: Clearing cache for user {user.pk}")
        cache.delete(student_cache_key)
        cached = None

    # If we have RICH cached data, and NOT forcing refresh, return it immediately
    if not force_refresh and _is_profile_rich(cached):
        print(f"[ERP] Strategy 1 HIT: Serving rich data for {search_email} from cache.")
        _sync_user_to_erp(user, cached)
        return Response(cached, status=200)

    print(f"[ERP] Strategy 1 {'REFRESH' if force_refresh else 'THIN'}: Syncing {search_email}...")

    # ── Strategy 2: Admin Bulk Cache Search (Global) ──────────────────────────
    # Removed the massive 17+ second synchronous fetch of all students. 
    # If the student is not in the individual cache, we skip straight to Strategy 3
    # which queries the ERP for their specific email address instead of the whole database.
    if not force_refresh:
        bulk_cache_key = 'erp_all_students_v1'
        bulk_cache = cache.get(bulk_cache_key)
        
        if bulk_cache and isinstance(bulk_cache, list):
            print(f"[ERP] Strategy 2: Filtering {search_email}/{search_username} from records...")
            for admission in bulk_cache:
                details = admission.get('student', {}).get('studentsDetails', [])
                admission_num = str(admission.get('admissionNumber') or '').strip().upper()
                
                email_match = any(d and str(d.get('studentEmail') or '').strip().lower() == search_email for d in details)
                adm_match = (admission_num == search_username or 
                             search_username in admission_num or 
                             admission_num in search_username) if search_username else False
                
                if email_match or adm_match:
                    print(f"[ERP] Strategy 2 SUCCESS: Found rich match in bulk cache.")
                    _sync_user_to_erp(user, admission)
                    cache.set(student_cache_key, admission, 300) # 5 Minute Cache
                    return Response(admission, status=200)

    # ── Strategy 3: Targeted API Call ──────────────────────────────────────────
    # Check if we are already fetching for this student to avoid Broken Pipe/Spam
    if not force_refresh and cache.get(lock_key):
        if cached: return Response(cached, status=200)
        return Response({"status": "syncing", "message": "Enrichment in progress"}, status=202)

    # Use Student Token if available, otherwise fallback to Admin Token for FORCE REFRESH
    student_erp_token = cache.get(f"erp_token_{user.pk}")
    active_token = student_erp_token
    is_admin_sync = False
    
    if not active_token and force_refresh:
        print(f"[ERP] No student token for {search_email}, using Admin Token for force refresh...")
        active_token = _get_erp_admin_token()
        is_admin_sync = True

    if active_token:
        cache.set(lock_key, True, 60) # 60s lock
        try:
            print(f"[ERP] Strategy 3: TARGETED fetch for {search_email} (Force: {force_refresh}, Admin: {is_admin_sync})...")
            target_record = None
            
            # Sub-Strategy 3a: Email Filter (Primary)
            try:
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

    if cached:
        print(f"[ERP] Strategy 4: Returning best available cached data.")
        return Response(cached, status=200)

    print(f"[ERP] Strategy 4: Returning local mock.")
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
        # 1. Sync Section/Codes
        sec = admission_data.get('sectionAllotment', {})
        if isinstance(sec, dict):
            user.exam_section = sec.get('examSection')
            user.study_section = sec.get('studySection')
            user.omr_code = sec.get('omrCode')
            user.rm_code = sec.get('rm')
        
        # 2. Sync Name from studentsDetails
        details_list = admission_data.get('student', {}).get('studentsDetails', [])
        if details_list and isinstance(details_list, list) and len(details_list) > 0:
            details = details_list[0]
            name = details.get('studentName', '')
            if name:
                parts = name.strip().split(' ')
                user.first_name = parts[0]
                user.last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
        
        user.save()
        print(f"[SYNC] ✓ User {user.username} synced with ERP.")
    except Exception as e:
        print(f"[SYNC] ⚠ Failed to sync user {user.username}: {e}")

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_students_erp_data(request):
    CACHE_KEY = 'erp_all_students_v1'

    # Serve from cache unless a forced refresh is requested
    force_refresh = request.GET.get('refresh') in ['true', '1', 'True']
    if not force_refresh:
        cached = cache.get(CACHE_KEY)
        if cached is not None:
            print(f"[ERP DEBUG] Serving {len(cached)} students from cache.")
            return Response(cached, status=200)

    try:
        erp_url = _get_erp_url()
        erp_token = _get_erp_admin_token()

        if not erp_token:
            print("[ERP DEBUG] Admin token unavailable — ERP may be sleeping. Returning empty.")
            # Return 200 with empty list so the frontend doesn't crash; user can retry later
            return Response([], status=200)

        # The ERP admission endpoint returns 52 MB — stream it with a 90s timeout
        print(f"[ERP DEBUG] Fetching students from {erp_url}/api/admission (stream, 90s timeout)")
        resp = requests.get(
            f"{erp_url}/api/admission",
            headers={"Authorization": f"Bearer {erp_token}"},
            timeout=90,
            stream=True
        )

        # Auto-retry once on 401
        if resp.status_code == 401:
            print("[ERP DEBUG] Admin Token 401. Retrying with fresh login...")
            erp_token = _get_erp_admin_token(force_refresh=True)
            resp = requests.get(
                f"{erp_url}/api/admission",
                headers={"Authorization": f"Bearer {erp_token}"},
                timeout=90,
                stream=True
            )

        print(f"[ERP DEBUG] Admission API Status: {resp.status_code}")

        if resp.status_code == 200:
            import json as _json
            raw_content = resp.content  # reads entire streamed response
            print(f"[ERP DEBUG] Downloaded {len(raw_content) // 1024} KB")
            data = _json.loads(raw_content)

            # Handle list vs wrapped dict
            final_data = data
            if isinstance(data, dict):
                final_data = data.get('data') or data.get('admissions') or data.get('students') or []
            if not isinstance(final_data, list):
                final_data = [final_data] if isinstance(final_data, dict) else []

            print(f"[ERP DEBUG] Parsed {len(final_data)} student records — caching for 1 hour")
            cache.set(CACHE_KEY, final_data, 3600)  # cache 1 hour so 52 MB isn't re-downloaded every request
            return Response(final_data, status=200)

        error_msg = f"ERP API Error: {resp.status_code}"
        print(f"[ERP DEBUG] {error_msg} - {resp.text[:200]}")
        # Graceful degradation: return empty list so frontend doesn't show a broken state
        return Response([], status=200)

    except Exception as e:
        print(f"[ERP ERROR] get_all_students_erp_data: {e}")
        import traceback
        traceback.print_exc()
        # Graceful degradation on timeout/network errors
        return Response([], status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_centres_erp_data(request):
    try:
        erp_url = _get_erp_url()
        erp_token = _get_erp_admin_token()
        
        if not erp_token:
            return Response({"error": "ERP Authentication Failed", "details": "Could not obtain admin token"}, status=500)

        resp = requests.get(f"{erp_url}/api/centre", headers={"Authorization": f"Bearer {erp_token}"}, timeout=20)
        
        if resp.status_code == 401:
            erp_token = _get_erp_admin_token(force_refresh=True)
            resp = requests.get(f"{erp_url}/api/centre", headers={"Authorization": f"Bearer {erp_token}"}, timeout=20)
            
        if resp.status_code == 200:
            data = resp.json()
            # Handle possible wrapping
            if isinstance(data, dict):
                data = data.get('data') or data.get('centres') or data
            return Response(data if isinstance(data, list) else [data], status=200)

        return Response({
            "error": f"ERP Centre API Error: {resp.status_code}",
            "details": resp.text[:200]
        }, status=resp.status_code if resp.status_code >= 400 else 500)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

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
            cache.set(CACHE_KEY, final_data, 3600)
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
