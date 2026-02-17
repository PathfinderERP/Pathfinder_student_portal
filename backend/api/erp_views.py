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
    Helper to get an admin token with strict timeouts for Render/Gunicorn stability.
    """
    cache_key = 'erp_admin_auth_token_v4'
    token = cache.get(cache_key)
    if token:
        return token

    erp_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
    admin_email = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
    admin_pass = os.getenv('ERP_ADMIN_PASSWORD', '000000')

    try:
        print(f"[ERP] Attempting Admin login for {admin_email}...")
        resp = requests.post(
            f"{erp_url}/api/superAdmin/login",
            json={"email": admin_email, "password": admin_pass},
            timeout=15 
        )
        if resp.status_code == 200:
            token = resp.json().get('token')
            if token:
                cache.set(cache_key, token, 82800)
                return token
        print(f"[ERP] Admin Login failed: {resp.status_code} {resp.text[:100]}")
    except Exception as e:
        print(f"[ERP] Admin Login Exception: {e}")
    return None

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_erp_data(request):
    """
    Stabilized ERP Fetch with detailed error logging.
    """
    try:
        user = request.user
        search_email = (user.email or user.username).strip().lower()
        
        # 1. Cache Check
        cache_key = f"erp_student_data_v4_{user.pk}"
        if not request.GET.get('refresh'):
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

        erp_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
        
        # 2. PRIORITY: Student Token Fetch (Fast Path)
        student_erp_token = cache.get(f"erp_token_{user.pk}")
        if student_erp_token:
            try:
                print(f"[ERP] Attempting DIRECT fetch for {search_email} using student token...")
                headers = {"Authorization": f"Bearer {student_erp_token}"}
                profile_resp = requests.get(f"{erp_url}/api/admission", headers=headers, timeout=20)
                
                if profile_resp.status_code == 200:
                    data_raw = profile_resp.json()
                    # Determine if result is the direct student or a list
                    target_data = None
                    if isinstance(data_raw, list):
                        for item in data_raw:
                            if not isinstance(item, dict): continue
                            details = item.get('student', {}).get('studentsDetails', [])
                            if any(d and d.get('studentEmail', '').lower() == search_email for d in details):
                                target_data = item
                                break
                    elif isinstance(data_raw, dict):
                        target_data = data_raw

                    if target_data:
                        print(f"[ERP] SUCCESS: Direct fetch worked for {search_email}")
                        _sync_user_to_erp(user, target_data)
                        cache.set(cache_key, target_data, 1800)
                        return Response(target_data, status=200)
                else:
                    print(f"[ERP] Direct fetch status: {profile_resp.status_code}")
            except Exception as e:
                print(f"[ERP] Direct fetch error (falling back to admin): {e}")

        # 3. BACKUP: Admin Search (Slow Path)
        erp_admin_token = _get_erp_admin_token()
        if not erp_admin_token:
            return Response({"error": "ERP security gateway is unresponsive. Please try again later."}, status=503)

        print(f"[ERP] FALLBACK: Searching admissions list via Admin...")
        admissions_resp = requests.get(
            f"{erp_url}/api/admission",
            headers={"Authorization": f"Bearer {erp_admin_token}"},
            timeout=25 
        )
        
        if admissions_resp.status_code != 200:
            return Response({"error": "ERP database busy. Please try again in 1 minute."}, status=503)
        
        admissions = admissions_resp.json()
        if not isinstance(admissions, list):
            admissions = []

        student_admission = None
        for admission in admissions:
            if not isinstance(admission, dict): continue
            details = admission.get('student', {}).get('studentsDetails', [])
            if any(d and d.get('studentEmail', '').strip().lower() == search_email for d in details):
                student_admission = admission
                break
        
        if student_admission:
            print(f"[ERP] SUCCESS: Admin search found record for {search_email}")
            _sync_user_to_erp(user, student_admission)
            cache.set(cache_key, student_admission, 1800)
            return Response(student_admission, status=200)
            
        print(f"[ERP] NOT FOUND: No admission record for {search_email}")
        return Response({"error": "No valid admission record found in ERP for your email."}, status=404)
        
    except requests.Timeout:
        return Response({"error": "ERP connection timed out."}, status=504)
    except Exception as e:
        print(f"[ERP] CRITICAL VIEW ERROR: {str(e)}")
        traceback.print_exc() # Print full tech details to server log
        return Response({"error": f"Internal sync error: {str(e)}"}, status=500)

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
            print(f"[ERP] Local sync complete for {user.username}")
    except Exception as e:
        print(f"[ERP] Local sync failed: {e}")

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_students_erp_data(request):
    try:
        if not (request.user.is_staff or request.user.user_type in ['admin', 'superadmin']):
            return Response({"error": "Unauthorized"}, status=403)
        
        erp_token = _get_erp_admin_token()
        if not erp_token: return Response({"error": "ERP Auth Failed"}, status=503)

        base_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
        resp = requests.get(f"{base_url}/api/admission", headers={"Authorization": f"Bearer {erp_token}"}, timeout=25)
        return Response(resp.json() if resp.status_code == 200 else {"error": "Fetch failed"}, status=resp.status_code)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_centres_erp_data(request):
    try:
        erp_token = _get_erp_admin_token()
        base_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
        resp = requests.get(f"{base_url}/api/centre", headers={"Authorization": f"Bearer {erp_token}"}, timeout=20)
        return Response(resp.json() if resp.status_code == 200 else {"error": "Fetch failed"}, status=resp.status_code)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_attendance(request):
    try:
        user = request.user
        base_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
        erp_token = cache.get(f"erp_token_{user.pk}")
        if not erp_token: return Response({"error": "No ERP token"}, status=401)
        resp = requests.get(f"{base_url}/api/student-portal/attendance", headers={"Authorization": f"Bearer {erp_token}"}, timeout=25)
        return Response(resp.json() if resp.status_code == 200 else {"error": "Fetch failed"}, status=resp.status_code)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_classes(request):
    try:
        user = request.user
        base_url = (os.getenv('ERP_API_URL') or 'https://pfndrerp.in').strip('/')
        erp_token = cache.get(f"erp_token_{user.pk}")
        if not erp_token: return Response({"error": "No ERP token"}, status=401)
        resp = requests.get(f"{base_url}/api/student-portal/classes", headers={"Authorization": f"Bearer {erp_token}"}, timeout=25)
        return Response(resp.json() if resp.status_code == 200 else {"error": "Fetch failed"}, status=resp.status_code)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
