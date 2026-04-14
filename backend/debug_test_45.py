import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from master_data.models import MasterSection

test = Test.objects.get(id=45)
print(f"Test: {test.name} (ID: {test.id})")
print(f"Allotted Sections: {list(test.allotted_sections.all())}")

foundation = MasterSection.objects.filter(name__icontains="Foundation").first()
if foundation:
    print(f"Foundation Section ID: {foundation.id}")
    tests_assigned = foundation.allotted_tests.all()
    print(f"Tests assigned to Foundation: {[t.id for t in tests_assigned]}")
else:
    print("Foundation section not found in MasterSection")

# Check legacy sections too
from sections.models import Section
legacy_sections = Section.objects.filter(test_id=45)
print(f"Legacy Sections pointing to this test: {[s.name for s in legacy_sections]}")
