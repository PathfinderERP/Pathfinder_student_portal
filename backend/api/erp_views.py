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
    This endpoint acts as a proxy to avoid CORS issues.
    Caches data for 5 minutes to improve performance.
    """
    try:
        # Check if user is admin/staff
        if not (request.user.is_staff or request.user.is_superuser or request.user.user_type == 'admin'):
            return Response(
                {"error": "Permission denied. Admin access required."},
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
            timeout=60  # Longer timeout for large dataset
        )
        
        if admissions_resp.status_code != 200:
            return Response(
                {"error": "Failed to fetch admission data from ERP"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        admissions = admissions_resp.json()
        
        # Cache the data for 5 minutes (300 seconds)
        cache.set(cache_key, admissions, 300)
        
        # Return all admissions data
        return Response(admissions, status=status.HTTP_200_OK)
        
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
def get_student_attendance(request):
    """
    Fetch student's attendance history from ERP based on their student ID.
    This endpoint finds the student's ERP ID first, then fetches their attendance.
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
        
        # Fetch admissions data to find student ID
        headers = {"Authorization": f"Bearer {erp_token}"}
        admissions_resp = requests.get(
            f"{erp_url}/api/admission",
            headers=headers,
            timeout=30
        )
        
        if admissions_resp.status_code != 200:
            return Response(
                {"error": "Failed to fetch student lookup data from ERP"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        admissions = admissions_resp.json()
        student_id = None
        
        # Find student's ERP ID
        for admission in admissions:
            student_info = admission.get('student', {})
            details_list = student_info.get('studentsDetails', [])
            
            for detail in details_list:
                if detail:
                    email = detail.get('studentEmail', '')
                    if email and email.lower() == search_email.lower():
                        student_id = student_info.get('_id')
                        break
            if student_id:
                break
        
        if not student_id:
            return Response(
                {"error": "Student record not found in ERP"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Now fetch attendance using the found student_id
        # The route mentioned in the task is: /api/academics/student-attendance/student/:studentId
        attendance_resp = requests.get(
            f"{erp_url}/api/academics/student-attendance/student/{student_id}",
            headers=headers,
            timeout=30
        )
        
        if attendance_resp.status_code != 200:
            # If the route doesn't exist yet or fails, return an empty list gracefully
            # but log the status for debugging if needed
            if attendance_resp.status_code == 404:
                return Response([], status=status.HTTP_200_OK)
            
            return Response(
                {"error": "Failed to fetch attendance data from ERP"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        attendance_data = attendance_resp.json()
        return Response(attendance_data, status=status.HTTP_200_OK)
        
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
