print("Starting script...")
import os
import django
import sys
from bson import ObjectId

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
print("Django setup done.")

from tests.models import Test

def test_inspect():
    print("Listing tests...")
    tests = Test.objects.all()[:5]
    for t in tests:
        print(f"Test in DB: {t.id} - {t.name}")
    
    try:
        t = Test.objects.get(pk=18)
        print(f"Found test 18: {t.name}")
    except:
        print("Test 18 NOT found by pk=18.")

if __name__ == "__main__":
    test_inspect()
