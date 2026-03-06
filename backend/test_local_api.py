import os
import django
import sys
import requests

# Setup django to get settings
base_dir = os.path.dirname(os.path.abspath(__file__))
if base_dir not in sys.path:
    sys.path.append(base_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from api.models import CustomUser

user = CustomUser.objects.get(username='admin')
refresh = RefreshToken.for_user(user)
token = str(refresh.access_token)

print(f"Using token: {token[:10]}...")

url = 'http://127.0.0.1:3001/api/admin/erp-teachers/?refresh=true'
resp = requests.get(url, headers={'Authorization': f'Bearer {token}'})

print(f"Status: {resp.status_code}")
print(f"Content Length: {len(resp.text)}")
if len(resp.text) < 1000:
    print(f"Content: {resp.text}")
else:
    print(f"Content starts with: {resp.text[:200]}...")

# Check log again
if os.path.exists('erp_debug.log'):
    print("\n--- erp_debug.log content ---")
    with open('erp_debug.log', 'r') as f:
        print(f.read())
