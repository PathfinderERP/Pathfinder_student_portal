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

def _get_erp_admin_token(force_refresh=False):
    """
    Resilient admin token fetch. 
    Intentionally uses a longer timeout specifically for the login handshake.
    """
    cache_key = 'erp_admin_auth_token_v6'
    
    if not force_refresh:
        token = cache.get(cache_key)
        if token:
            return token

    # CRITICAL: These must be set in Render dashboard environment variables!
    erp_url = _get_erp_url()
    admin_email = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
    admin_pass = os.getenv('ERP_ADMIN_PASSWORD', '000000')

    try:
        # 60s timeout — Render-hosted ERP has long cold-start wake times
        print(f"[ERP DEBUG] Logging in to: {erp_url}/api/superAdmin/login with {admin_email}")
        resp = requests.post(
            f"{erp_url}/api/superAdmin/login",
            json={"email": admin_email, "password": admin_pass},
            timeout=60
        )
        print(f"[ERP DEBUG] Status: {resp.status_code}")
        if resp.status_code == 200:
            token = resp.json().get('token')
            if token:
                print(f"[ERP DEBUG] Token Obtained Successfully")
                cache.set(cache_key, token, 86400) # 24 Hours
                return token
        else:
            print(f"[ERP] Admin Login Rejected: {resp.status_code} - {resp.text[:200]}")
    except Exception as e:
        print(f"[ERP] Admin Handshake Failed: {e}")
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

    # ── Quick Check: Strategy 1 - Individual Cache ─────────────────────────────
    student_cache_key = f"erp_student_data_v6_{user.pk}"
    lock_key = f"erp_sync_lock_{user.pk}"
    cached = cache.get(student_cache_key)
    
    # If we have RICH cached data, return it immediately
    if not request.GET.get('refresh') and _is_profile_rich(cached):
        print(f"[ERP] Strategy 1 HIT: Serving rich data for {search_email} from cache.")
        _sync_user_to_erp(user, cached)
        return Response(cached, status=200)

    print(f"[ERP] Strategy 1 THIN: Searching for enrichment for {search_email}...")

    # ── Strategy 2: Admin Bulk Cache Search (Global) ──────────────────────────
    bulk_cache_key = 'erp_all_students_v1'
    bulk_cache = cache.get(bulk_cache_key)
    
    # PROACTIVE ENRICHMENT: If bulk cache is missing, try to fetch it once using Admin Token
    if not bulk_cache and not request.GET.get('no_bulk'):
        sync_lock = 'erp_bulk_sync_in_progress'
        if not cache.get(sync_lock):
            cache.set(sync_lock, True, 300) # 5 min lock
            print(f"[ERP] Strategy 2 PROACTIVE: Fetching master list via Admin (120s timeout)...")
            try:
                admin_token = _get_erp_admin_token()
                if admin_token:
                    # HEAVY FETCH: 120s timeout for 52MB payload
                    resp = requests.get(f"{erp_url}/api/admission", 
                                        headers={"Authorization": f"Bearer {admin_token}"},
                                        timeout=120, stream=True)
                    if resp.status_code == 200:
                        raw_data = resp.json() if not resp.content else __import__('json').loads(resp.content)
                        if isinstance(raw_data, list) and len(raw_data) > 1000:
                            print(f"[ERP] Strategy 2: Master list ({len(raw_data)}) cached.")
                            cache.set(bulk_cache_key, raw_data, 7200)
                            bulk_cache = raw_data
            except Exception as e:
                print(f"[ERP] Strategy 2 Bulk Sync failed: {e}")
            finally:
                cache.delete(sync_lock)

    if bulk_cache and isinstance(bulk_cache, list):
        print(f"[ERP] Strategy 2: Filtering {search_email}/{search_username} from {len(bulk_cache)} records...")
        count = 0
        for admission in bulk_cache:
            count += 1
            details = admission.get('student', {}).get('studentsDetails', [])
            admission_num = str(admission.get('admissionNumber') or '').strip().upper()
            
            email_match = any(d and str(d.get('studentEmail') or '').strip().lower() == search_email for d in details)
            adm_match = (admission_num == search_username or 
                         search_username in admission_num or 
                         admission_num in search_username) if search_username else False
            
            if email_match or adm_match:
                print(f"[ERP] Strategy 2 SUCCESS: Found rich match for {search_email} at record #{count}.")
                _sync_user_to_erp(user, admission)
                cache.set(student_cache_key, admission, 3600)
                return Response(admission, status=200)

    # ── Strategy 3: Targeted API Call (Student Token) ────────────────────────
    # Check if we are already fetching for this student to avoid Broken Pipe/Spam
    if cache.get(lock_key):
        if cached: return Response(cached, status=200)
        return Response({"status": "syncing", "message": "Enrichment in progress"}, status=202)

    student_erp_token = cache.get(f"erp_token_{user.pk}")
    if student_erp_token:
        cache.set(lock_key, True, 60) # 60s lock
        try:
            print(f"[ERP] Strategy 3: TARGETED fetch for {search_email}...")
            # Optimization: Try targeted query params if supported, then fallback
            target_record = None
            
            # Sub-Strategy 3a: Email Filter
            try:
                resp = requests.get(f"{erp_url}/api/admission?studentEmail={search_email}", 
                                    headers={"Authorization": f"Bearer {student_erp_token}"}, timeout=45)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list) and len(data) > 0: target_record = data[0]
                    elif isinstance(data, dict) and data.get('student'): target_record = data
            except: pass

            # Sub-Strategy 3b: Full Fetch (Resilient Fallback)
            if not target_record:
                print(f"[ERP] Strategy 3b: Targeted failed, trying full fetch for student token...")
                resp = requests.get(f"{erp_url}/api/admission", 
                                    headers={"Authorization": f"Bearer {student_erp_token}"}, timeout=120)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict) and data.get('student'):
                        target_record = data
                    elif isinstance(data, list):
                        for admission in data:
                            details = admission.get('student', {}).get('studentsDetails', [])
                            admission_num = str(admission.get('admissionNumber') or '').strip().upper()
                            if any(d and str(d.get('studentEmail') or '').strip().lower() == search_email for d in details) or \
                               (search_username and admission_num == search_username):
                                target_record = admission
                                break
            
            if target_record:
                print(f"[ERP] Strategy 3 SUCCESS: Profile enriched.")
                _sync_user_to_erp(user, target_record)
                cache.set(student_cache_key, target_record, 3600)
                return Response(target_record, status=200)
        except Exception as e:
            print(f"[ERP ERROR] Strategy 3 failed: {e}")
        finally:
            cache.delete(lock_key)

    # ── Strategy 4: Final Fallback ────────────────────────────────────────────
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
        
        # 2. Sync Names
        details = admission_data.get('student', {}).get('studentsDetails', [])
        if details and isinstance(details, list) and len(details) > 0:
            name = details[0].get('studentName', '')
            if name:
                parts = name.strip().split(' ')
                user.first_name = parts[0]
                user.last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
        
        user.save()
        print(f"✓ Synced user {user.username} with ERP data.")
    except Exception as e:
        print(f"⚠ Failed to sync user {user.username}: {e}")

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
