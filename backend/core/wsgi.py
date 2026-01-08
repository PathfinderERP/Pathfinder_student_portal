"""
WSGI config for core project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Apply Djongo patches BEFORE application load
try:
    from djongo_patch import apply_djongo_patches
    apply_djongo_patches()
except ImportError:
    pass

application = get_wsgi_application()
