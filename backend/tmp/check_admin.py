import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser

admin_user = CustomUser.objects.filter(username__icontains='Admin').first()
if not admin_user:
    admin_user = CustomUser.objects.first()

if admin_user:
    print(f"Found user: {admin_user.username}")
    print(f"User Type: '{admin_user.user_type}'")
    print(f"User ID: {admin_user.pk}")
    print(f"Model keys: {list(admin_user.__dict__.keys())}")
else:
    print("No users found at all.")
