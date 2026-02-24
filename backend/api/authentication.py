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
        """
        ALWAYS validate students against ERP to ensure they still exist.
        This prevents deleted ERP students from accessing the portal.
        """
        import os
        from django.core.cache import cache

        # Clean inputs
        if username:
            username = username.strip().lower()
        if password:
            password = password.strip()

        print(f"🔐 Attempting ERP Student Login for: {username}")
        erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in')
        
        # Check if local user exists (can be username or email)
        from django.db.models import Q
        local_user = None
        try:
            local_user = CustomUser.objects.filter(Q(username=username) | Q(email=username)).first()
            if local_user:
                print(f"✓ Found local user: {local_user.username}, type: {local_user.user_type}, active: {local_user.is_active}")
                # If user exists but is NOT a student, skip ERP validation
                if local_user.user_type != 'student':
                    print(f"→ User {local_user.username} is not a student, skipping ERP validation (letting ModelBackend handle)")
                    return None  # Let ModelBackend handle admin/staff
            else:
                print(f"ℹ No local user found for {username}, will create if ERP validates")
        except Exception as e:
            print(f"⚠ Error searching for local user: {e}")
            pass

        try:
            # Payload for Student Portal Login
            auth_payload = {
                "username": username,
                "password": password
            }
            
            # ALWAYS validate against ERP for students
            login_url = f"{erp_url}/api/student-portal/login"
            resp = requests.post(login_url, json=auth_payload, timeout=20)
            
            if resp.status_code == 200:
                data = resp.json()
                erp_token = data.get('token')
                student_data = data.get('student', {})
                
                if erp_token:
                    print(f"✓ ERP Login Successful for {username}")
                    
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

                    # Update or Create Local User
                    if local_user:
                        print(f"Updating existing user {username}")
                        if not local_user.check_password(password):
                            local_user.set_password(password)
                        local_user.is_active = True
                        user = local_user
                    else:
                        print(f"Creating new local user for {username}")
                        user = CustomUser.objects.create_user(
                            username=username,
                            email=username,
                            password=password,
                            user_type='student'
                        )
                    
                    # Perform full sync from student_data
                    try:
                        # 1. Sync Section/Codes
                        sec = student_data.get('sectionAllotment', {})
                        if isinstance(sec, dict):
                            user.exam_section = sec.get('examSection')
                            user.study_section = sec.get('studySection')
                            user.omr_code = sec.get('omrCode')
                            user.rm_code = sec.get('rm')
                        
                        # 2. Sync Names
                        details = student_data.get('studentsDetails', [])
                        if details and hasattr(details, '__iter__') and len(details) > 0:
                            name = details[0].get('studentName', '')
                            if name:
                                parts = name.strip().split(' ')
                                user.first_name = parts[0]
                                user.last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
                        
                        user.save()
                        print(f"✓ Fully synced {username} from ERP login response")
                    except Exception as e:
                        print(f"⚠ Minor error during login sync for {username}: {e}")

                    # CACHE THE FULL ERP RESPONSE for the profile view
                    # We remove the token to keep the cache clean, but keep the rest
                    profile_cache_data = data.copy()
                    if 'token' in profile_cache_data:
                        profile_cache_data.pop('token')
                    
                    student_cache_key = f"erp_student_data_v6_{user.pk}"
                    cache.set(student_cache_key, profile_cache_data, timeout=3600)  # 1 hour
                    print(f"✓ Cached rich ERP profile data for {username}")

                    # CACHE THE TOKEN for use in other views
                    cache_key = f"erp_token_{user.pk}"
                    cache.set(cache_key, erp_token, timeout=86400)  # 24 hours
                    print(f"✓ Cached ERP token for user {user.pk}")
                    
                    return user
                    
            else:
                # ERP validation failed - analyze the reason
                error_message = "Unknown error"
                try:
                    error_data = resp.json()
                    error_message = error_data.get('message', error_data.get('error', str(error_data)))
                except:
                    error_message = resp.text[:200] if resp.text else f"HTTP {resp.status_code}"
                
                print(f"✗ ERP Login Failed: {resp.status_code} - {error_message}")
                
                # Determine the reason for failure
                is_deactivated = False
                is_deleted = False
                is_wrong_password = False
                user_facing_message = None  # Message to show to the user
                
                # Check error message for clues
                error_lower = error_message.lower()
                
                # Specific check for ERP's deactivation message
                if 'account has been deactivated' in error_lower or 'contact administration' in error_lower:
                    is_deactivated = True
                    user_facing_message = error_message  # Use ERP's exact message
                    print(f"⚠ Student {username} is DEACTIVATED in ERP (account deactivated by admin)")
                elif 'inactive' in error_lower or 'disabled' in error_lower or 'suspended' in error_lower:
                    is_deactivated = True
                    user_facing_message = "Your account has been deactivated. Please contact administration."
                    print(f"⚠ Student {username} is DEACTIVATED in ERP")
                elif 'not found' in error_lower or 'does not exist' in error_lower or resp.status_code == 404:
                    is_deleted = True
                    user_facing_message = "No active account found with the given credentials"
                    print(f"⚠ Student {username} NOT FOUND in ERP (deleted)")
                elif 'invalid' in error_lower and ('password' in error_lower or 'credential' in error_lower):
                    is_wrong_password = True
                    user_facing_message = "No active account found with the given credentials"
                    print(f"⚠ Invalid credentials for {username}")
                elif resp.status_code == 401:
                    # Generic 401 - likely wrong password
                    is_wrong_password = True
                    user_facing_message = "No active account found with the given credentials"
                    print(f"⚠ Authentication failed for {username} (likely wrong password)")
                
                # Cache the error message for the serializer to retrieve
                # Only cache if this was actually a student attempting ERP login
                if user_facing_message and (local_user is None or local_user.user_type == 'student'):
                    error_cache_key = f"auth_error_{username}"
                    cache.set(error_cache_key, user_facing_message, timeout=10)  # 10 seconds
                    print(f"📝 Cached error message for {username}")
                
                # Handle local user based on failure reason
                if local_user and local_user.user_type == 'student':
                    if is_deactivated or is_deleted:
                        # Student is deactivated or deleted in ERP - deactivate locally
                        reason = "deactivated by ERP admin" if is_deactivated else "deleted from ERP"
                        print(f"⚠ Deactivating local student account {username} ({reason})")
                        local_user.is_active = False
                        local_user.save()
                    elif is_wrong_password:
                        # Just wrong password - don't deactivate account
                        print(f"ℹ Wrong password for {username}, account remains active")
                        # Could implement login attempt tracking here
                
                return None

        except requests.exceptions.RequestException as e:
            print(f"ERP API Request Error: {e}")
            # Network error - allow login if user exists locally and was recently validated
            # This prevents lockout during ERP downtime
            if local_user and local_user.user_type == 'student' and local_user.is_active:
                cache_key = f"erp_token_{local_user.pk}"
                cached_token = cache.get(cache_key)
                if cached_token:
                    print(f"⚠ ERP unreachable, allowing login with cached credentials")
                    return local_user
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

class LocalUserBackend(BaseBackend):
    """
    Authenticate non-student users (Admin, Staff, Superadmin) 
    using either Username OR Email.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None
            
        from django.db.models import Q
        try:
            # Find user by username or email
            user = CustomUser.objects.filter(
                Q(username__iexact=username) | Q(email__iexact=username)
            ).first()
            
            if user and user.user_type != 'student':
                if user.check_password(password):
                    if user.is_active:
                        print(f"✓ Local Login Successful for {user.username} ({user.user_type})")
                        return user
                    else:
                        print(f"✗ Local Login Failed: Account {user.username} is inactive")
            return None
        except Exception as e:
            print(f"⚠ Local Auth Error: {e}")
            return None

    def get_user(self, user_id):
        try:
            if isinstance(user_id, str):
                from bson import ObjectId
                if ObjectId.is_valid(user_id):
                    return CustomUser.objects.get(pk=ObjectId(user_id))
            return CustomUser.objects.get(pk=user_id)
        except (CustomUser.DoesNotExist, Exception):
            return None
