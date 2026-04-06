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
    print(f"RES:{admin_user.username}:{admin_user.user_type}")
else:
    print("RES:NONE:NONE")
