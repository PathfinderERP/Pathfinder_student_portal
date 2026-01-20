import re
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings


class DisableCSRFMiddleware(MiddlewareMixin):
    """
    Middleware to disable CSRF protection for specific URL patterns.
    Used for API endpoints that use JWT authentication instead of CSRF tokens.
    """
    def process_request(self, request):
        exempt_urls = getattr(settings, 'CSRF_EXEMPT_LIST', [])
        path = request.path_info.lstrip('/')
        
        for pattern in exempt_urls:
            if re.match(pattern, '/' + path):
                setattr(request, '_dont_enforce_csrf_checks', True)
                break
        
        return None
