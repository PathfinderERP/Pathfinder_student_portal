import os
import sys
import django
from rest_framework_simplejwt.tokens import RefreshToken

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser

admin_user = CustomUser.objects.filter(username__icontains='admin').first()
if admin_user:
    token = RefreshToken.for_user(admin_user)
    # The custom claims are added to the refresh token in get_token override
    # and then copied to the access token.
    access_token = token.access_token
    print(f"RES:claims:{list(access_token.keys())}")
    print(f"RES:user_type:{access_token.get('user_type')}")
else:
    print("RES:NOT_FOUND")
