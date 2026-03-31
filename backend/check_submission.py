import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser

user = CustomUser.objects.filter(username__icontains='fortwilliam1@gmail.com').first()
if user:
    print(f"User: {user.username} | Type: {getattr(user, 'user_type', 'N/A')}")
else:
    print("User not found.")
