import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from tests.views import TestViewSet

User = get_user_model()
user = User.objects.filter(email="jmaity24@gmail.com").first()
if not user:
    print("User not found!")
    exit(1)

print(f"Testing as user: {user.username} ({user.pk})")

# Clear server-side cache first
from django.core.cache import cache
cache_key = f"my_results_{user.pk}"
cache.delete(cache_key)
print(f"Cleared cache key: {cache_key}")

# Use DRF APIRequestFactory
factory = APIRequestFactory()
request = factory.get('/api/tests/my_results/')
force_authenticate(request, user=user)

view = TestViewSet.as_view({'get': 'my_results'})
response = view(request)
response.accepted_renderer = None  # Not needed for data inspection

data = response.data
print(f"\nStatus code: {response.status_code}")
print(f"Response data type: {type(data)}")
print(f"Number of results: {len(data) if isinstance(data, list) else 'NOT A LIST'}")

if isinstance(data, list):
    for r in data:
        print(f"\n  Test: {r.get('name')} ({r.get('code')})")
        print(f"  Score: {r.get('marks')} / {r.get('total')}")
        print(f"  Rank: {r.get('rank')}")
        print(f"  Percentile: {r.get('percentile')}")
        print(f"  Date: {r.get('date')}")
        print(f"  Section stats: {r.get('section_stats')}")
else:
    print(f"Raw data: {data}")
