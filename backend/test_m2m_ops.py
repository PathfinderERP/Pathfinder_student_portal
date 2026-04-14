import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from master_data.models import MasterSection

test_id = 45
test = Test.objects.get(id=test_id)
print(f"Before: {list(test.allotted_sections.all())}")

print("Attempting to clear allotted_sections...")
test.allotted_sections.clear()

test.refresh_from_db()
print(f"After clear(): {list(test.allotted_sections.all())}")

# Try adding and removing back
foundation = MasterSection.objects.get(id=1)
print("Adding Foundation back...")
test.allotted_sections.add(foundation)
print(f"After add: {list(test.allotted_sections.all())}")

print("Removing Foundation...")
test.allotted_sections.remove(foundation)
print(f"After remove: {list(test.allotted_sections.all())}")
