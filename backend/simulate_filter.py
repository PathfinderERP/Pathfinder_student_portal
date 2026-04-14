import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from master_data.models import MasterSection

section_id = 1
tests = Test.objects.filter(allotted_sections=section_id)
print(f"Tests filtered by ID 1: {list(tests)}")

# Try with __in
tests_in = Test.objects.filter(allotted_sections__in=[section_id])
print(f"Tests filtered by [1] in: {list(tests_in)}")

# Check test 45 specifically again
test45 = Test.objects.get(id=45)
print(f"Test 45 Allotted Sections: {list(test45.allotted_sections.all())}")
