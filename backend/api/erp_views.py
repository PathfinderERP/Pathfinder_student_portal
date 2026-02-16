from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import requests
import os
from django.core.cache import cache

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_erp_data(request):
    """
    Fetch student's ERP data for the authenticated user.
    This endpoint acts as a proxy to avoid CORS issues.
    """
    try:
        user = request.user
        search_email = user.email or user.username
        
        # Get ERP credentials from environment
        erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in')
        erp_admin_email = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
        erp_admin_password = os.getenv('ERP_ADMIN_PASSWORD', '000000')
        
        # Login to ERP as superadmin
        login_resp = requests.post(
            f"{erp_url}/api/superAdmin/login",
            json={"email": erp_admin_email, "password": erp_admin_password},
            timeout=10
        )
        
        if login_resp.status_code != 200:
            return Response(
                {"error": "Failed to authenticate with ERP system"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        erp_token = login_resp.json().get('token')
        if not erp_token:
            return Response(
                {"error": "No token received from ERP"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Fetch admissions data
        headers = {"Authorization": f"Bearer {erp_token}"}
        admissions_resp = requests.get(
            f"{erp_url}/api/admission",
            headers=headers,
            timeout=30
        )
        
        if admissions_resp.status_code != 200:
            return Response(
                {"error": "Failed to fetch admission data from ERP"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        admissions = admissions_resp.json()
        
        # Find student's admission record
        student_admission = None
        for admission in admissions:
            student_info = admission.get('student', {})
            details_list = student_info.get('studentsDetails', [])
            
            for detail in details_list:
                if detail:
                    email = detail.get('studentEmail', '')
                    if email and email.lower() == search_email.lower():
                        student_admission = admission
                        break
            
            if student_admission:
                break
        
        if not student_admission:
            return Response(
                {"error": "Student record not found in ERP"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return the student's admission data
        return Response(student_admission, status=status.HTTP_200_OK)
        
    except requests.RequestException as e:
        return Response(
            {"error": f"Network error connecting to ERP: {str(e)}"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_students_erp_data(request):
    """
    Fetch all students from ERP for admin users.
    This endpoint acts as a proxy to avoid CORS issues and authentication hurdles for staff.
    """
    try:
        # Inclusive check for any administrative role
        is_admin = (
            request.user.is_staff or 
            request.user.is_superuser or 
            request.user.user_type in ['admin', 'superadmin', 'staff']
        )
        
        if not is_admin:
            return Response(
                {"error": "Permission denied. Administrative access required."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check cache first
        cache_key = 'erp_all_students_data'
        cached_data = cache.get(cache_key)
        
        if cached_data and not request.GET.get('refresh'):
            return Response(cached_data, status=status.HTTP_200_OK)
        
        # Get ERP credentials from environment
        erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in')
        erp_admin_email = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
        erp_admin_password = os.getenv('ERP_ADMIN_PASSWORD', '000000')
        
        # Login to ERP as superadmin
        login_resp = requests.post(
            f"{erp_url}/api/superAdmin/login",
            json={"email": erp_admin_email, "password": erp_admin_password},
            timeout=10
        )
        
        if login_resp.status_code != 200:
            return Response(
                {"error": "Failed to authenticate with ERP system using admin credentials"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        erp_token = login_resp.json().get('token')
        
        # Fetch admissions data
        headers = {"Authorization": f"Bearer {erp_token}"}
        admissions_resp = requests.get(
            f"{erp_url}/api/admission",
            headers=headers,
            timeout=60
        )
        
        if admissions_resp.status_code != 200:
            return Response(
                {"error": "Failed to fetch admission data from ERP"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        admissions = admissions_resp.json()
        
        # Cache for 5 minutes
        cache.set(cache_key, admissions, 300)
        
        return Response(admissions, status=status.HTTP_200_OK)
        
    except requests.RequestException as e:
        return Response({"error": f"ERP Network Error: {str(e)}"}, status=503)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_centres_erp_data(request):
    """
    Fetch all centres from ERP for admin users via proxy.
    """
    try:
        is_admin = (
            request.user.is_staff or 
            request.user.is_superuser or 
            request.user.user_type in ['admin', 'superadmin', 'staff']
        )
        
        if not is_admin:
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        
        cache_key = 'erp_all_centres_data'
        cached_data = cache.get(cache_key)
        if cached_data and not request.GET.get('refresh'):
            return Response(cached_data, status=status.HTTP_200_OK)
        
        erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in')
        erp_admin_email = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
        erp_admin_password = os.getenv('ERP_ADMIN_PASSWORD', '000000')
        
        login_resp = requests.post(
            f"{erp_url}/api/superAdmin/login",
            json={"email": erp_admin_email, "password": erp_admin_password},
            timeout=10
        )
        
        if login_resp.status_code != 200:
            return Response({"error": "ERP Auth Failed"}, status=503)
        
        erp_token = login_resp.json().get('token')
        headers = {"Authorization": f"Bearer {erp_token}"}
        centres_resp = requests.get(f"{erp_url}/api/centre", headers=headers, timeout=30)
        
        if centres_resp.status_code != 200:
            return Response({"error": "Failed to fetch centres"}, status=503)
        
        centres = centres_resp.json()
        centres_data = centres.get('data') if isinstance(centres, dict) else centres
        
        cache.set(cache_key, centres_data, 300)
        return Response(centres_data, status=200)
        
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
        erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in')
        
        if not user.is_authenticated:
            return Response("Please login", status=401)
            
        erp_token = cache.get(f"erp_token_{user.pk}")
        
        if not erp_token:
            return Response(
                {"error": "Session expired. Please logout and login again."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        headers = {"Authorization": f"Bearer {erp_token}"}
        
        # 2. Fetch Attendance directly
        att_url = f"{erp_url}/api/student-portal/attendance"
        att_resp = requests.get(att_url, headers=headers, timeout=20)
        
        if att_resp.status_code == 200:
             return Response(att_resp.json(), status=status.HTTP_200_OK)
        elif att_resp.status_code == 401:
             return Response({"error": "ERP Token Expired"}, status=status.HTTP_401_UNAUTHORIZED)
        else:
             print(f"Attendance Fetch Failed: {att_resp.status_code}")
             return Response(
                 {"error": f"Failed to fetch attendance data: {att_resp.status_code}"},
                 status=status.HTTP_503_SERVICE_UNAVAILABLE
             )
    
    except Exception as e:
        print(f"Error fetching attendance: {e}")
        return Response({"error": "Internal Server Error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_classes(request):
    """
    Fetch student's class schedule from ERP using cached Student Token.
    """
    try:
        user = request.user
        erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in')
        
        # 1. Retrieve Cached ERP Token (stored during login)
        from django.core.cache import cache
        erp_token = cache.get(f"erp_token_{user.pk}")
        
        if not erp_token:
            print(f"No ERP token found for user {user.username}")
            return Response(
                {"error": "Session expired or invalid. Please logout and login again to refresh permissions."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        headers = {"Authorization": f"Bearer {erp_token}"}
        
        # 2. Fetch Classes directly
        print(f"Fetching classes for {user.username} using Student Token...")
        classes_url = f"{erp_url}/api/student-portal/classes"
        
        # Note: If this fails with 403, it means the token is invalid/expired
        classes_resp = requests.get(classes_url, headers=headers, timeout=20)
        
        if classes_resp.status_code != 200:
            print(f"ERP Classes Fetch Failed: {classes_resp.status_code} {classes_resp.text[:100]}")
            if classes_resp.status_code == 401:
                 return Response({"error": "ERP Token Expired"}, status=status.HTTP_401_UNAUTHORIZED)
            return Response(
                {"error": "Failed to fetch class schedule"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
            
        all_classes = classes_resp.json()
        if not isinstance(all_classes, list):
            all_classes = []
            
        print(f"Fetched {len(all_classes)} classes directly from Student Portal")

        # 3. Fetch Attendance to merge status
        try:
            att_url = f"{erp_url}/api/student-portal/attendance"
            att_resp = requests.get(att_url, headers=headers, timeout=20)
            
            if att_resp.status_code == 200:
                attendance_records = att_resp.json()
                att_map = {}
                for record in attendance_records:
                    class_sched = record.get('classScheduleId')
                    if isinstance(class_sched, dict):
                        class_id = class_sched.get('_id')
                    else:
                        class_id = class_sched
                    
                    if class_id:
                        att_map[class_id] = record.get('status', 'Present')
                
                # Merge into classes
                for cls in all_classes:
                    cls_id = cls.get('_id')
                    if cls_id in att_map:
                        cls['attendanceAttributes'] = {'status': att_map[cls_id]}
                        cls['studentAttendance'] = att_map[cls_id]
            else:
                 print(f"Attendance Fetch Failed: {att_resp.status_code}")
        except Exception as e:
            print(f"Error merging attendance: {e}")

        # Sort
        try:
            all_classes.sort(key=lambda x: (x.get('date', ''), x.get('startTime', '')), reverse=True)
        except:
            pass 

        return Response(all_classes, status=status.HTTP_200_OK)

    except requests.RequestException as e:
        return Response(
            {"error": f"Network error connecting to ERP: {str(e)}"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
