from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.core.cache import cache
import requests
import os
import threading


class StudentActiveCheckMiddleware(MiddlewareMixin):
    """
    Middleware to check if student is still active in ERP on every request.
    Only checks for authenticated students, not admin/staff.
    Uses cached validation to avoid excessive ERP API calls.
    """
    
    def process_request(self, request):
        # Skip for non-authenticated users
        if not request.user or not request.user.is_authenticated:
            return None
        
        # Skip for non-students (admin, staff, etc.)
        if getattr(request.user, 'user_type', None) != 'student':
            return None
        
        # Skip for login/logout endpoints to avoid recursion
        if request.path in ['/api/token/', '/api/token/refresh/', '/api/logout/']:
            return None
            
        # SAFETY FIRST: Skip ERP check if user is taking a test
        # If the path looks like an active test (submit answers, start test, etc.), we DO NOT logout.
        if '/api/tests/' in request.path:
            return None
        
        # Check if user is deactivated locally
        if not request.user.is_active:
            return JsonResponse({
                'error': 'Your account has been deactivated. Please contact administration.',
                'code': 'ACCOUNT_DEACTIVATED'
            }, status=403)
        
        # Periodic ERP validation (every 60 minutes)
        cache_key = f"erp_validation_{request.user.pk}"
        last_validated = cache.get(cache_key)
        
        if last_validated is None:
            # Set a temporary cache marker to prevent concurrent background checks
            cache.set(cache_key, 'pending', timeout=300)
            
            # Start ERP validation in a background thread to keep the request non-blocking
            threading.Thread(target=self.validate_student_in_erp, args=(request.user,)).start()
        
        return None
    
    def validate_student_in_erp(self, user):
        """
        Quick validation check with ERP using cached token.
        Returns True if student is active, False otherwise.
        """
        try:
            erp_url = os.getenv('ERP_API_URL', 'https://pfndrerp.in')
            token_cache_key = f"erp_token_{user.pk}"
            erp_token = cache.get(token_cache_key)
            
            if not erp_token:
                print(f"No cached ERP token for {user.username}")
                cache.set(f"erp_validation_{user.pk}", True, timeout=3600)
                return False
            
            headers = {'Authorization': f'Bearer {erp_token}'}
            response = requests.get(
                f"{erp_url}/api/student-portal/profile",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✓ ERP validation and SYNC successful for {user.username}")
                from .erp_views import _sync_user_to_erp
                data = response.json()
                admission_data = data.get('student', data) if isinstance(data.get('student'), dict) else data
                _sync_user_to_erp(user, admission_data)
                cache.set(f"erp_validation_{user.pk}", True, timeout=3600)
                return True
            elif response.status_code in [401, 403]:
                print(f"✗ ERP validation failed for {user.username}: {response.status_code}")
                user.is_active = False
                user.save()
                cache.delete(token_cache_key)
                cache.set(f"erp_validation_{user.pk}", False, timeout=3600)
                return False
            else:
                print(f"⚠ ERP validation error for {user.username}: {response.status_code}")
                cache.set(f"erp_validation_{user.pk}", True, timeout=3600)
                return True
                
        except requests.exceptions.RequestException as e:
            print(f"⚠ ERP validation network error for {user.username}: {e}")
            cache.set(f"erp_validation_{user.pk}", True, timeout=3600)
            return True
        except Exception as e:
            print(f"⚠ ERP validation exception for {user.username}: {e}")
            cache.set(f"erp_validation_{user.pk}", True, timeout=3600)
            return True
