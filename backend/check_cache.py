import os
import django
import sys

# Setup django
base_dir = os.path.dirname(os.path.abspath(__file__))
if base_dir not in sys.path:
    sys.path.append(base_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.cache import cache

CACHE_KEY = 'erp_all_teachers_v1'
cached = cache.get(CACHE_KEY)

print(f"Cached data: {cached is not None}")
if cached is not None:
    print(f"Cached length: {len(cached)}")
    if len(cached) == 0:
        print("ALERT: Cache is empty!")
        # Clear it
        cache.delete(CACHE_KEY)
        print("Deleted empty cache.")
else:
    print("Cache is empty (None).")
