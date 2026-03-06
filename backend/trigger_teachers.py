import os
import django
import sys
from unittest.mock import MagicMock

# Setup django
base_dir = os.path.dirname(os.path.abspath(__file__))
if base_dir not in sys.path:
    sys.path.append(base_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.erp_views import get_all_teachers_erp_data
from rest_framework.test import APIRequestFactory

factory = APIRequestFactory()
request = factory.get('/api/admin/erp-teachers/?refresh=true')

# Mock authentication
from api.models import CustomUser
try:
    user = CustomUser.objects.get(username='admin')
except:
    user = CustomUser.objects.create_superuser(username='admin', email='admin@example.com', password='password')

request.user = user

response = get_all_teachers_erp_data(request)
print(f"Status Code: {response.status_code}")
print(f"Data length: {len(response.data)}")
if len(response.data) > 0:
    print(f"First item: {response.data[0]}")
else:
    print(f"Response data: {response.data}")

# Check if erp_debug.log was created
if os.path.exists('erp_debug.log'):
    print("\n--- erp_debug.log content ---")
    with open('erp_debug.log', 'r') as f:
        print(f.read())
