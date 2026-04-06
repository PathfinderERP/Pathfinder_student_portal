import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser
from api.serializers import UserSerializer

admin_user = CustomUser.objects.filter(username__icontains='admin').first()
if admin_user:
    serializer = UserSerializer(admin_user)
    print(f"Serialized user_type: '{serializer.data.get('user_type')}'")
    print(f"All serialized keys: {list(serializer.data.keys())}")
else:
    print("User not found")
