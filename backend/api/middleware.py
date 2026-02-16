from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.core.cache import cache
import requests
import os


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
        
        # Check if user is deactivated locally
        if not request.user.is_active:
            return JsonResponse({
                'error': 'Your account has been deactivated. Please contact administration.',
                'code': 'ACCOUNT_DEACTIVATED'
            }, status=403)
        
        # Periodic ERP validation (every 5 minutes to reduce API load)
        cache_key = f"erp_validation_{request.user.pk}"
        last_validated = cache.get(cache_key)
        
        if last_validated is None:
            # Not validated recently - check ERP
            is_valid = self.validate_student_in_erp(request.user)
            
            if not is_valid:
                # Student no longer valid in ERP - deactivate and reject
                request.user.is_active = False
                request.user.save()
                
                # Clear cached ERP token
                token_cache_key = f"erp_token_{request.user.pk}"
                cache.delete(token_cache_key)
                
                return JsonResponse({
                    'error': 'Your account has been deactivated in the ERP system. Please contact administration.',
                    'code': 'ERP_ACCOUNT_DEACTIVATED',
                    'logout': True  # Signal frontend to logout
                }, status=403)
            else:
                # Student is valid - cache validation for 5 minutes
                cache.set(cache_key, True, timeout=300)  # 5 minutes
        
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
                # No cached token - student needs to re-login
                print(f"No cached ERP token for {user.username}")
                return False
            
            # Try to fetch student data with cached token
            # This validates both token and student status
            headers = {'Authorization': f'Bearer {erp_token}'}
            response = requests.get(
                f"{erp_url}/api/student-portal/profile",  # Or any student endpoint
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✓ ERP validation successful for {user.username}")
                return True
            elif response.status_code in [401, 403]:
                # Token invalid or student deactivated
                print(f"✗ ERP validation failed for {user.username}: {response.status_code}")
                return False
            else:
                # Other error - assume valid to avoid false lockouts
                print(f"⚠ ERP validation error for {user.username}: {response.status_code}")
                return True  # Fail open on errors
                
        except requests.exceptions.RequestException as e:
            # Network error - assume valid to avoid lockout during ERP downtime
            print(f"⚠ ERP validation network error for {user.username}: {e}")
            return True  # Fail open on network errors
        except Exception as e:
            print(f"⚠ ERP validation exception for {user.username}: {e}")
            return True  # Fail open on unexpected errors
