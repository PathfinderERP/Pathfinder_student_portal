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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_erp_data(request):
    """
    Fast per-student ERP data lookup with multi-strategy resilience.
    """
    user = request.user
    search_email = (user.email or user.username).strip().lower()
    search_username = user.username.strip().upper() # Often the Admission Number
    erp_url = _get_erp_url()

    # Local DB fallback structure
    local_data = {
        "sectionAllotment": {
            "examSection": user.exam_section,
            "studySection": user.study_section,
            "omrCode": user.omr_code,
            "rm": user.rm_code
        },
        "student": {
            "studentsDetails": [{
                "studentEmail": search_email, 
                "studentName": f"{user.first_name} {user.last_name}",
                "mobileNum": "—", # Avoid 'undefined' in frontend
                "dateOfBirth": "—",
                "schoolName": "Loading...",
                "board": "—"
            }]
        },
        "is_offline": True,
        "sync_status": "pending"
    }

    # ── Quick Check: Is our individual cache rich enough? ─────────────────────
    student_cache_key = f"erp_student_data_v6_{user.pk}"
    cached = cache.get(student_cache_key)
    if not request.GET.get('refresh') and cached and isinstance(cached, dict):
        details = cached.get('student', {}).get('studentsDetails', [])
        # If we have mobile Num, the cache is 'rich' — use it immediately
        if details and details[0].get('mobileNum'):
            print(f"[ERP] Strategy 1 HIT: Serving rich data for {search_email} from cache.")
            _sync_user_to_erp(user, cached)
            return Response(cached, status=200)

    # ── Strategy 2: Admin Bulk Cache Search (THE FIX: Get rich data from 20k list) ──
    bulk_cache = cache.get('erp_all_students_v1')
    if bulk_cache and isinstance(bulk_cache, list):
        print(f"[ERP] Strategy 2: Enriching {search_email} from bulk cache...")
        for admission in bulk_cache:
            details = admission.get('student', {}).get('studentsDetails', [])
            admission_num = str(admission.get('admissionNumber') or '').strip().upper()
            
            if any(d and str(d.get('studentEmail') or '').strip().lower() == search_email for d in details) or \
               admission_num == search_username or admission_num == user.username.upper():
                
                print(f"[ERP] Strategy 2 HIT: Rich data found for {search_email}.")
                _sync_user_to_erp(user, admission)
                cache.set(student_cache_key, admission, 3600)
                return Response(admission, status=200)
    
    # ── Strategy 1 Fallback: Serve the 'thin' cache if bulk search failed ─────
    if cached:
        print(f"[ERP] Strategy 1 Fallback: Serving existing (possibly thin) data for {search_email}.")
        return Response(cached, status=200)

    # ── Strategy 3: Student-Token Direct Call ─────────────────────────────────
    student_erp_token = cache.get(f"erp_token_{user.pk}")
    if student_erp_token:
        try:
            print(f"[ERP] Strategy 3: Using student token for {search_email}...")
            # 60s timeout for cold starts
            resp = requests.get(
                f"{erp_url}/api/admission",
                headers={"Authorization": f"Bearer {student_erp_token}"},
                timeout=60,
                stream=True
            )
            if resp.status_code == 200:
                data = resp.json() if not resp.content else __import__('json').loads(resp.content)
                
                target_record = None
                if isinstance(data, dict) and data.get('student'):
                    target_record = data
                elif isinstance(data, list):
                    for admission in data:
                        details = admission.get('student', {}).get('studentsDetails', [])
                        admission_num = str(admission.get('admissionNumber') or '').strip().upper()
                        if any(d and str(d.get('studentEmail') or '').strip().lower() == search_email for d in details) or admission_num == search_username:
                            target_record = admission
                            break
                
                if target_record:
                    print(f"[ERP] Strategy 3 HIT: Obtained Profile.")
                    _sync_user_to_erp(user, target_record)
                    cache.set(student_cache_key, target_record, 3600)
                    return Response(target_record, status=200)
        except Exception as e:
            print(f"[ERP ERROR] Strategy 3 failed: {e}")

    # ── Strategy 4: Fallback ──────────────────────────────────────────────────
    print(f"[ERP] Strategy 4 (Fallback) for {search_email}.")
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
