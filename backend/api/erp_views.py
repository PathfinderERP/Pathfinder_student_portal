from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import requests
import os
from django.core.cache import cache

def _get_erp_admin_token():
    """
    Helper to get an admin token with caching to avoid redundant logins.
    """
    cache_key = 'erp_admin_auth_token'
    token = cache.get(cache_key)
    if token:
        return token

    erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in').strip('/')
    admin_email = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
    admin_pass = os.getenv('ERP_ADMIN_PASSWORD', '000000')

    try:
        resp = requests.post(
            f"{erp_url}/api/superAdmin/login",
            json={"email": admin_email, "password": admin_pass},
            timeout=25 # Increased timeout for login
        )
        if resp.status_code == 200:
            token = resp.json().get('token')
            if token:
                # Cache for 23 hours (assuming 24h validity)
                cache.set(cache_key, token, 82800)
                return token
    except Exception as e:
        print(f"[ERP] Admin Login Error: {e}")
    return None

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_erp_data(request):
    """
    Fetch student's ERP data with caching and optimized timeouts.
    """
    try:
        user = request.user
        search_email = (user.email or user.username).strip().lower()
        
        # 1. Check Student Specific Cache (v2)
        cache_key = f"erp_student_data_{user.pk}"
        if not request.GET.get('refresh'):
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

        # 2. Get Admin Token
        erp_token = _get_erp_admin_token()
        if not erp_token:
            # Fallback one-time attempt if cache was stale
            erp_token = _get_erp_admin_token() 
            if not erp_token:
                return Response({"error": "ERP authentication service unavailable"}, status=503)

        erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in').strip('/')
        headers = {"Authorization": f"Bearer {erp_token}"}
        
        # 3. Fetch Admissions with substantial timeout
        print(f"[ERP] Fetching admissions for {search_email}...")
        admissions_resp = requests.get(
            f"{erp_url}/api/admission",
            headers=headers,
            timeout=60 # High timeout for large admission list
        )
        
        if admissions_resp.status_code != 200:
            return Response({"error": "ERP admission service timeout"}, status=503)
        
        admissions = admissions_resp.json()
        
        # 4. Search for student record (Optimized lookup)
        student_admission = None
        for admission in admissions:
            student_info = admission.get('student', {})
            details = student_info.get('studentsDetails', [])
            
            # Efficiently check email matches
            found = False
            for d in details:
                if d and d.get('studentEmail', '').strip().lower() == search_email:
                    found = True
                    break
            
            if found:
                student_admission = admission
                break
        
        if not student_admission:
            return Response({"error": "Student profile sync pending on ERP"}, status=404)
        
        # 5. Sync details to local User model
        try:
            sec = student_admission.get('sectionAllotment', {})
            if sec:
                user.exam_section = sec.get('examSection')
                user.study_section = sec.get('studySection')
                user.omr_code = sec.get('omrCode')
                user.rm_code = sec.get('rm')
                user.save()
        except Exception:
            pass
        
        # Cache results for 30 minutes to reduce ERP load
        cache.set(cache_key, student_admission, 1800)
        return Response(student_admission, status=status.HTTP_200_OK)
        
    except requests.Timeout:
        return Response({"error": "ERP server took too long to respond. Please try again in a few moments."}, status=504)
    except Exception as e:
        print(f"[ERP] Critical Internal Error: {str(e)}")
        return Response({"error": "Failed to synchronize ERP data"}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_students_erp_data(request):
    """
    Fetch all students from ERP for admin users.
    """
    try:
        if not (request.user.is_staff or request.user.user_type in ['admin', 'superadmin']):
            return Response({"error": "Unauthorized"}, status=403)
        
        cache_key = 'erp_all_students_master'
        if not request.GET.get('refresh'):
            cached = cache.get(cache_key)
            if cached: return Response(cached, status=200)

        erp_token = _get_erp_admin_token()
        if not erp_token: return Response({"error": "ERP Auth Failed"}, status=503)

        erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in').strip('/')
        resp = requests.get(
            f"{erp_url}/api/admission",
            headers={"Authorization": f"Bearer {erp_token}"},
            timeout=90 # Even higher for admin master list
        )
        
        if resp.status_code == 200:
            data = resp.json()
            cache.set(cache_key, data, 600)
            return Response(data, status=200)
        return Response({"error": "ERP master list timeout"}, status=503)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_centres_erp_data(request):
    """
    Fetch all centres from ERP for admin users via proxy.
    """
    try:
        if not (request.user.is_staff or request.user.user_type in ['admin', 'superadmin']):
            return Response({"error": "Admin access required."}, status=403)
        
        cache_key = 'erp_centres_master'
        cached = cache.get(cache_key)
        if cached and not request.GET.get('refresh'):
            return Response(cached, status=200)
        
        erp_token = _get_erp_admin_token()
        erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in').strip('/')
        
        resp = requests.get(f"{erp_url}/api/centre", headers={"Authorization": f"Bearer {erp_token}"}, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            centres = data.get('data') if isinstance(data, dict) else data
            cache.set(cache_key, centres, 3600)
            return Response(centres, status=200)
        return Response({"error": "ERP centers service timeout"}, status=503)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_attendance(request):
    """
    Fetch student's attendance history from ERP using cached Student Token.
    """
    try:
        user = request.user
        erp_token = cache.get(f"erp_token_{user.pk}")
        if not erp_token:
            return Response({"error": "ERP session expired. Please re-login."}, status=401)

        erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in').strip('/')
        resp = requests.get(
            f"{erp_url}/api/student-portal/attendance", 
            headers={"Authorization": f"Bearer {erp_token}"}, 
            timeout=30
        )
        
        if resp.status_code == 200:
             return Response(resp.json(), status=200)
        return Response({"error": "Failed to fetch attendance"}, status=resp.status_code)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_classes(request):
    """
    Fetch student's class schedule from ERP using cached Student Token.
    """
    try:
        user = request.user
        erp_token = cache.get(f"erp_token_{user.pk}")
        if not erp_token:
            return Response({"error": "ERP session expired. Please re-login."}, status=401)

        erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in').strip('/')
        headers = {"Authorization": f"Bearer {erp_token}"}
        
        classes_resp = requests.get(f"{erp_url}/api/student-portal/classes", headers=headers, timeout=40)
        if classes_resp.status_code != 200:
            return Response({"error": "ERP classes service timeout"}, status=503)
            
        all_classes = classes_resp.json()
        if not isinstance(all_classes, list): all_classes = []

        # Optional Attendance merge
        try:
            att_resp = requests.get(f"{erp_url}/api/student-portal/attendance", headers=headers, timeout=20)
            if att_resp.status_code == 200:
                att_map = { (r.get('classScheduleId', {}).get('_id') if isinstance(r.get('classScheduleId'), dict) else r.get('classScheduleId')): r.get('status') for r in att_resp.json() if r.get('classScheduleId') }
                for cls in all_classes:
                    cid = cls.get('_id')
                    if cid in att_map:
                        cls['studentAttendance'] = att_map[cid]
        except: pass

        try:
            all_classes.sort(key=lambda x: (x.get('date', ''), x.get('startTime', '')), reverse=True)
        except: pass 

        return Response(all_classes, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
