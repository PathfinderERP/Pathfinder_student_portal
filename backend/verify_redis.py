import os
import django
from django.conf import settings

# Setup Django atmosphere before any imports
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.cache import cache

def test_redis():
    print(f"Testing Redis connection at: {os.getenv('REDIS_URL')}")
    try:
        # 1. Basic Set/Get
        cache.set("test_key", "redis_is_working", timeout=60)
        value = cache.get("test_key")
        
        if value == "redis_is_working":
            print("SUCCESS: Redis connection established. Set/Get working.")
            # 2. Delete test key
            cache.delete("test_key")
            return True
        else:
            print(f"FAILED: Connection seems to be there but data mismatch. Found: {value}")
            return False
            
    except Exception as e:
        print(f"ERROR: Could not connect to Redis: {e}")
        return False

if __name__ == "__main__":
    test_redis()
