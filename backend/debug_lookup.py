
import os
import django
from bson import ObjectId

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from sections.models import Section

test_id_str = "696746f96003394d43c3bc25"

print(f"Testing lookup for ID: {test_id_str}")

# Test 1: String Lookup
try:
    s = Section.objects.get(pk=test_id_str)
    print(f"Success with string: {s}")
except Exception as e:
    print(f"Failed with string: {e}")

# Test 2: ObjectId Lookup
try:
    oid = ObjectId(test_id_str)
    s = Section.objects.get(pk=oid)
    print(f"Success with ObjectId: {s}")
except Exception as e:
    print(f"Failed with ObjectId: {e}")

# List all just in case
print("All Sections:")
for s in Section.objects.all()[:5]:
    print(f"{s.pk} ({type(s.pk)}) - {s.name}")
