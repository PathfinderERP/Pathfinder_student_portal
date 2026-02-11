import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser

username = "malakshahid@gmail.com"
try:
    user = CustomUser.objects.get(username=username)
    print(f"User found: {user.username}, ID: {user._id}, Type: {user.user_type}")
except CustomUser.DoesNotExist:
    print(f"User {username} NOT found.")
except Exception as e:
    print(f"Error: {e}")
