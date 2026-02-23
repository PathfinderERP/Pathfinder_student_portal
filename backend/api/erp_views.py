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
    Render-Optimized Resilient Dashboard Sync.
    Prioritizes Student Token and Local Fallback to avoid Gunicorn 30s kills.
    """
    user = request.user
    search_email = (user.email or user.username).strip().lower()
    
    # 1. Quick Cache Check
    cache_key = f"erp_student_data_v6_{user.pk}"
    if not request.GET.get('refresh'):
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

    # 2. Local Fallback Structure
    local_data = {
        "sectionAllotment": {
            "examSection": user.exam_section,
            "studySection": user.study_section,
            "omrCode": user.omr_code,
            "rm": user.rm_code
        },
        "student": {
            "studentsDetails": [{"studentEmail": search_email, "studentName": f"{user.first_name} {user.last_name}"}]
        },
        "is_offline": True
    }

    erp_url = _get_erp_url()
    
    # 3. Resilient Multi-Strategy Sync
    try:
        student_erp_token = cache.get(f"erp_token_{user.pk}")
        
        # Strategy A: Direct Student Access (Fast)
        # Strategy A: Direct Student Access (Fast)
        if student_erp_token:
            try:
                resp = requests.get(f"{erp_url}/api/admission", headers={"Authorization": f"Bearer {student_erp_token}"}, timeout=15)
                if resp.status_code == 200:
                    data = resp.json()
                    target = data if isinstance(data, dict) else None
                    if isinstance(data, list):
                        target = next((
                            i for i in data 
                            if any(d and str(d.get('studentEmail') or '').strip().lower() == search_email 
                                   for d in i.get('student', {}).get('studentsDetails', []))
                        ), None)
                    
                    if target:
                        _sync_user_to_erp(user, target)
                        cache.set(cache_key, target, 3600)
                        return Response(target, status=200)
            except Exception as e:
                print(f"[ERP WARNING] Strategy A failed: {e}")

        # Strategy B: Admin Proxy Sync (Strict 12s cap to prevent Render kill)
        erp_admin_token = _get_erp_admin_token()
        if erp_admin_token:
            print(f"[ERP DEBUG] Token obtained. Searching for: {search_email}")
            resp = requests.get(f"{erp_url}/api/admission", headers={"Authorization": f"Bearer {erp_admin_token}"}, timeout=25)
            if resp.status_code == 200:
                admissions = resp.json()
                print(f"[ERP DEBUG] Fetched {len(admissions) if isinstance(admissions, list) else 0} records.")
                
                if isinstance(admissions, list):
                    for admission in admissions:
                        details = admission.get('student', {}).get('studentsDetails', [])
                        # SAFE COMPARISON: Handle None/Null values
                        if any(d and str(d.get('studentEmail') or '').strip().lower() == search_email for d in details):
                            print(f"[ERP DEBUG] Found match for {search_email}")
                            _sync_user_to_erp(user, admission)
                            cache.set(cache_key, admission, 3600)
                            return Response(admission, status=200)
                    
                    print(f"[ERP DEBUG] No match found for {search_email}")
            else:
                print(f"[ERP DEBUG] API Error: {resp.status_code}")

    except Exception as e:
        print(f"[ERP] Resilient Mode: Handled sync failure ({e})")

    # 4. SILENT SUCCESS: Return local data if ERP sync fails
    return Response(local_data, status=status.HTTP_200_OK)

def _sync_user_to_erp(user, admission_data):
    if not isinstance(admission_data, dict): return
    try:
        sec = admission_data.get('sectionAllotment', {})
        if isinstance(sec, dict):
            user.exam_section = sec.get('examSection')
            user.study_section = sec.get('studySection')
            user.omr_code = sec.get('omrCode')
            user.rm_code = sec.get('rm')
            user.save()
    except: pass

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
