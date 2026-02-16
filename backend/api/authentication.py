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

        try:
            import os
            from django.core.cache import cache

            # Clean inputs
            if username:
                username = username.strip().lower()
            if password:
                password = password.strip()

            print(f"Attempting ERP Student Login for: {username}")
            erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in')
            
            # Payload for Student Portal Login
            # Based on testing, 'username' and 'password' work
            auth_payload = {
                "username": username,
                "password": password
            }
            
            # Try login
            login_url = f"{erp_url}/api/student-portal/login"
            try:
                # Login directly as student
                resp = requests.post(login_url, json=auth_payload, timeout=20)
                
                if resp.status_code == 200:
                    data = resp.json()
                    erp_token = data.get('token')
                    student_data = data.get('student', {})
                    
                    if erp_token:
                        print(f"ERP Login Successful for {username}")
                        
                        # Extract Name if available
                        first_name = 'Student'
                        last_name = ''
                        try:
                            details = student_data.get('studentsDetails', [])
                            if details and hasattr(details, '__iter__') and len(details) > 0:
                                name = details[0].get('studentName', '')
                                if name:
                                    parts = name.strip().split(' ')
                                    first_name = parts[0]
                                    last_name = ' '.join(parts[1:])
                        except Exception as e:
                            print(f"Error parsing name: {e}")

                        # Create or Update Local User
                        try:
                            user = CustomUser.objects.get(username=username)
                            # Update password logic is handled by ModelBackend usually, 
                            # but we ensure it matches ERP here
                            if not user.check_password(password):
                                user.set_password(password)
                                user.save()
                                print(f"Updated local password for {username}")
                        except CustomUser.DoesNotExist:
                            print(f"Creating new local user for {username}")
                            user = CustomUser.objects.create_user(
                                username=username,
                                email=username,
                                password=password,
                                first_name=first_name,
                                last_name=last_name,
                                user_type='student'
                            )
                        
                        # CACHE THE TOKEN for use in views
                        cache_key = f"erp_token_{user.pk}"
                        # Cache for 24 hours (86400s)
                        cache.set(cache_key, erp_token, timeout=86400)
                        print(f"Cached ERP token for user {user.pk}")
                        
                        return user
                else:
                    print(f"ERP Login Failed: {resp.status_code} - {resp.text[:100]}")
                    return None

            except Exception as e:
                print(f"Error during ERP login request: {e}")
                return None
                
        except Exception as e:
            print(f"ERP Backend Error: {e}")
            import traceback
            traceback.print_exc()
            return None
                
        except Exception as e:
            print(f"ERP Backend Error: {e}")
            import traceback
            traceback.print_exc()
            return None

        print(f"Authentication failed for username: {username}")
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
