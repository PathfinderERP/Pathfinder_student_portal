import requests
from django.contrib.auth.backends import BaseBackend
from django.conf import settings
from .models import CustomUser

class ERPStudentBackend(BaseBackend):
    """
    Authenticate against the External ERP System using Email and Admission Number.
    If valid, creates a local student user on the fly.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        # 1. Check if user already exists. 
        # If they do, we can either:
        # a) Return None (let ModelBackend handle it) -> Good if we sync passwords
        # b) Re-validate against ERP to allow "password=admissionNumber" always.
        # Let's try to fetch user.
        try:
            user = CustomUser.objects.get(username=username)
            # If user exists and checks out with local password, ModelBackend will handle it.
            # But if ModelBackend fails (because user changed password or using admission number),
            # this backend will be called next (if configured correctly in settings).
            # So, we proceed to ERP check ONLY if we want to allow login via ERP creds 
            # even if local password differs, OR if we want to support this for non-existent users.
            
            # Use Case: User exists, but tries to login with Admission Number (ERP style).
            # ModelBackend failed (presumably). We check ERP.
        except CustomUser.DoesNotExist:
            user = None

        # 2. ERP Authentication Logic
        try:
            # A. Login as SuperAdmin to get Token (to search students)
            erp_url = "https://pathfinder-5ri2.onrender.com" # Should useenv variable
            # Use hardcoded superadmin for now as per previous context
            auth_payload = {
                "email": "atanu@gmail.com",
                "password": "000000"
            }
            
            # Simple timeout to prevent hanging
            token_resp = requests.post(f"{erp_url}/api/superAdmin/login", json=auth_payload, timeout=10)
            
            if token_resp.status_code != 200:
                print(f"ERP Admin Login Failed: {token_resp.status_code}")
                return None
                
            token = token_resp.json().get('token')
            if not token:
                return None

            # B. Fetch Admission List
            headers = {"Authorization": f"Bearer {token}"}
            # Note: Fetching all is inefficient, but 'api/admission' is what we have.
            valid_student = None
            
            # We need to loop because we don't know if pagination exists, 
            # but assuming the endpoint returns full list or we just check first page.
            # If the user list is huge, we really need a search endpoint.
            # Assuming 'api/admission' returns list.
            
            admission_resp = requests.get(f"{erp_url}/api/admission", headers=headers, timeout=15)
            
            if admission_resp.status_code == 200:
                admissions = admission_resp.json()
                
                # C. Find Student
                # Logic: student.studentsDetails[0].studentEmail == username (ignoring case)
                for admission in admissions:
                    student_info = admission.get('student', {})
                    details_list = student_info.get('studentsDetails', [])
                    
                    found = False
                    for detail in details_list:
                        email = detail.get('studentEmail', '')
                        if email and email.lower() == username.lower():
                            found = True
                            # D. Verify Password (Admission Number)
                            # The 'password' arg passed to this function is what the user typed.
                            # We expect it to match admission.admissionNumber
                            
                            erp_admission_number = admission.get('admissionNumber')
                            
                            if erp_admission_number == password:
                                valid_student = {
                                    'username': email,
                                    'first_name': detail.get('studentName', '').split(' ')[0],
                                    'last_name': ' '.join(detail.get('studentName', '').split(' ')[1:]),
                                    'password': password # Use admission number as local password too
                                }
                            break
                    if valid_student:
                        break

            # 3. Create or Update Local User
            if valid_student:
                if user:
                    # Update existing user's password to match ERP (so next time ModelBackend works)
                    user.set_password(valid_student['password'])
                    user.save()
                else:
                    # Create new user
                    user = CustomUser.objects.create_user(
                        username=valid_student['username'],
                        email=valid_student['username'],
                        password=valid_student['password'],
                        first_name=valid_student['first_name'],
                        last_name=valid_student['last_name'],
                        user_type='student'
                    )
                return user

        except Exception as e:
            print(f"ERP Backend Error: {e}")
            return None

        return None

    def get_user(self, user_id):
        try:
            # Django session framework passes user_id (often as string).
            # If using ObjectId, we must ensure it's compatible.
            if isinstance(user_id, str):
                from bson import ObjectId
                # Only try to convert if it looks like a valid ObjectId
                if ObjectId.is_valid(user_id):
                    return CustomUser.objects.get(pk=ObjectId(user_id))
            
            # Fallback for other types or standard lookup
            return CustomUser.objects.get(pk=user_id)
        except (CustomUser.DoesNotExist, Exception):
            return None
