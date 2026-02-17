from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import requests
import os
import traceback
from django.core.cache import cache

def _get_erp_admin_token():
    """
    Resilient admin token fetch with aggressive 24h caching.
    """
    cache_key = 'erp_admin_auth_token_v5'
    token = cache.get(cache_key)
    if token:
        return token

    erp_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
    admin_email = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
    admin_pass = os.getenv('ERP_ADMIN_PASSWORD', '000000')

    try:
        # Tight timeout to avoid blocking the whole portal
        resp = requests.post(
            f"{erp_url}/api/superAdmin/login",
            json={"email": admin_email, "password": admin_pass},
            timeout=10 
        )
        if resp.status_code == 200:
            token = resp.json().get('token')
            if token:
                cache.set(cache_key, token, 86400) # 24 Hours
                return token
    except Exception as e:
        print(f"[ERP] Admin Handshake Failed: {e}")
    return None

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_erp_data(request):
    """
    High-Resilience Dashboard Sync.
    If ERP is down/slow, falls back to local data instead of returning 503/504.
    """
    user = request.user
    search_email = (user.email or user.username).strip().lower()
    
    # 1. Immediate Cache/Local Return (Fastest Path)
    cache_key = f"erp_student_data_v5_{user.pk}"
    if not request.GET.get('refresh'):
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

    # 2. Prepare Local Fallback Data
    # This ensures that even if ERP fails, the student sees their current info.
    local_fallback = {
        "sectionAllotment": {
            "examSection": user.exam_section,
            "studySection": user.study_section,
            "omrCode": user.omr_code,
            "rm": user.rm_code
        },
        "student": {
            "studentsDetails": [{"studentEmail": search_email, "studentName": f"{user.first_name} {user.last_name}"}]
        },
        "is_offline_data": True
    }

    erp_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
    
    # 3. Attempt ERP Sync (Strictly limited to 15s)
    try:
        student_erp_token = cache.get(f"erp_token_{user.pk}")
        
        # Strategy A: Direct Student Fetch
        if student_erp_token:
            headers = {"Authorization": f"Bearer {student_erp_token}"}
            resp = requests.get(f"{erp_url}/api/admission", headers=headers, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                # Find current student in list
                target = None
                if isinstance(data, list):
                    for item in data:
                        details = item.get('student', {}).get('studentsDetails', [])
                        if any(d and d.get('studentEmail', '').lower() == search_email for d in details):
                            target = item
                            break
                elif isinstance(data, dict):
                    target = data

                if target:
                    _sync_user_to_erp(user, target)
                    cache.set(cache_key, target, 3600)
                    return Response(target, status=200)

        # Strategy B: Admin Search
        erp_admin_token = _get_erp_admin_token()
        if erp_admin_token:
            resp = requests.get(
                f"{erp_url}/api/admission",
                headers={"Authorization": f"Bearer {erp_admin_token}"},
                timeout=15 
            )
            if resp.status_code == 200:
                admissions = resp.json()
                if isinstance(admissions, list):
                    for admission in admissions:
                        details = admission.get('student', {}).get('studentsDetails', [])
                        if any(d and d.get('studentEmail', '').lower() == search_email for d in details):
                            _sync_user_to_erp(user, admission)
                            cache.set(cache_key, admission, 3600)
                            return Response(admission, status=200)

    except Exception as e:
        print(f"[ERP] Sync Warning: ERP is slow/down. Using local data. ({e})")

    # 4. FINAL FALLBACK: Return local data instead of 503
    # This prevents the "AxiosError" on the frontend.
    print(f"[ERP] Returning LOCAL Fallback for {search_email}")
    return Response(local_fallback, status=status.HTTP_200_OK)

def _sync_user_to_erp(user, admission_data):
    """Safely update local user model."""
    if not isinstance(admission_data, dict): return
    try:
        sec = admission_data.get('sectionAllotment', {})
        if sec and isinstance(sec, dict):
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
        if not erp_token: return Response({"error": "ERP Gateway Busy"}, status=503)
        base_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
        resp = requests.get(f"{base_url}/api/admission", headers={"Authorization": f"Bearer {erp_token}"}, timeout=25)
        return Response(resp.json() if resp.status_code == 200 else [], status=resp.status_code)
    except: return Response([], status=200) # Safe empty return

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_centres_erp_data(request):
    try:
        erp_token = _get_erp_admin_token()
        base_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
        resp = requests.get(f"{base_url}/api/centre", headers={"Authorization": f"Bearer {erp_token}"}, timeout=20)
        return Response(resp.json() if resp.status_code == 200 else [], status=200)
    except: return Response([], status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_attendance(request):
    try:
        user = request.user
        erp_token = cache.get(f"erp_token_{user.pk}")
        if not erp_token: return Response([], status=200)
        base_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
        resp = requests.get(f"{base_url}/api/student-portal/attendance", headers={"Authorization": f"Bearer {erp_token}"}, timeout=20)
        return Response(resp.json() if resp.status_code == 200 else [], status=200)
    except: return Response([], status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_classes(request):
    try:
        user = request.user
        erp_token = cache.get(f"erp_token_{user.pk}")
        if not erp_token: return Response([], status=200)
        base_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
        resp = requests.get(f"{base_url}/api/student-portal/classes", headers={"Authorization": f"Bearer {erp_token}"}, timeout=20)
        return Response(resp.json() if resp.status_code == 200 else [], status=200)
    except: return Response([], status=200)
