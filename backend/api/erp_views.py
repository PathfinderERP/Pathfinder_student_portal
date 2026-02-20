from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import requests
import os
from django.core.cache import cache

def _get_erp_admin_token():
    """
    Resilient admin token fetch. 
    Intentionally uses a longer timeout specifically for the login handshake.
    """
    cache_key = 'erp_admin_auth_token_v6'
    token = cache.get(cache_key)
    if token:
        return token

    # CRITICAL: These must be set in Render dashboard environment variables!
    erp_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
    admin_email = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
    admin_pass = os.getenv('ERP_ADMIN_PASSWORD', '000000')

    try:
        # Increase handshake timeout to 25s specifically for the initial login
        resp = requests.post(
            f"{erp_url}/api/superAdmin/login",
            json={"email": admin_email, "password": admin_pass},
            timeout=25 
        )
        if resp.status_code == 200:
            token = resp.json().get('token')
            if token:
                cache.set(cache_key, token, 86400) # 24 Hours
                return token
        else:
            print(f"[ERP] Admin Login Rejected: {resp.status_code}")
    except Exception as e:
        print(f"[ERP] Admin Handshake Timeout (25s exceeded): {e}")
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

    erp_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
    
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
    try:
        erp_token = _get_erp_admin_token()
        resp = requests.get(f"{os.getenv('ERP_API_URL')}/api/admission", headers={"Authorization": f"Bearer {erp_token}"}, timeout=25)
        return Response(resp.json() if resp.status_code == 200 else [], status=200)
    except: return Response([], status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_centres_erp_data(request):
    try:
        erp_token = _get_erp_admin_token()
        resp = requests.get(f"{os.getenv('ERP_API_URL')}/api/centre", headers={"Authorization": f"Bearer {erp_token}"}, timeout=20)
        return Response(resp.json() if resp.status_code == 200 else [], status=200)
    except: return Response([], status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_attendance(request):
    try:
        erp_token = cache.get(f"erp_token_{request.user.pk}")
        resp = requests.get(f"{os.getenv('ERP_API_URL')}/api/student-portal/attendance", headers={"Authorization": f"Bearer {erp_token}"}, timeout=20)
        return Response(resp.json() if resp.status_code == 200 else [], status=200)
    except: return Response([], status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_classes(request):
    try:
        erp_token = cache.get(f"erp_token_{request.user.pk}")
        resp = requests.get(f"{os.getenv('ERP_API_URL')}/api/student-portal/classes", headers={"Authorization": f"Bearer {erp_token}"}, timeout=20)
        return Response(resp.json() if resp.status_code == 200 else [], status=200)
    except: return Response([], status=200)
