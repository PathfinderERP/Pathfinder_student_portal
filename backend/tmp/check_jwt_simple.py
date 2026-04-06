import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser
from api.serializers import CustomTokenObtainPairSerializer

admin_user = CustomUser.objects.filter(username__icontains='admin').first()
if admin_user:
    token = CustomTokenObtainPairSerializer.get_token(admin_user)
    print(f"RES:user_type:{token.get('user_type')}")
else:
    print("RES:NOT_FOUND")
