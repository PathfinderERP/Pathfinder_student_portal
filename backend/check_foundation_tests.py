import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from master_data.models import MasterSection

foundation = MasterSection.objects.get(id=1)
print(f"Section: {foundation.name}")

allotted_tests = Test.objects.filter(allotted_sections=foundation)
print(f"Allotted Online Tests Count: {allotted_tests.count()}")
for t in allotted_tests:
    print(f" - {t.name} (ID: {t.id})")

# Check Pen Paper Tests too
from master_data.models import PenPaperTest
allotted_pp = PenPaperTest.objects.filter(sections=foundation)
print(f"Allotted Pen Paper Tests Count: {allotted_pp.count()}")
for ppt in allotted_pp:
    print(f" - {ppt.name} (ID: {ppt.id})")
