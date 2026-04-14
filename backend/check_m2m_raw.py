import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from django.db import connection

test_id = 45
try:
    test = Test.objects.get(id=test_id)
    print(f"Test Name: {test.name}")
    print(f"Test Allotted Sections (Django): {list(test.allotted_sections.all())}")
    
    # Check the through table manually
    m2m_field = Test._meta.get_field('allotted_sections')
    through_model = m2m_field.remote_field.through
    allotments = through_model.objects.filter(test_id=test_id)
    print(f"Through Table Entries: {[(a.test_id, a.mastersection_id) for a in allotments]}")

except Test.DoesNotExist:
    print("Test 45 not found")

# Check if there's any other test with a similar name
similar_tests = Test.objects.filter(name__icontains="DEMO CLAP")
for t in similar_tests:
    print(f"Similar Test: {t.name} (ID: {t.id}) Sections: {list(t.allotted_sections.all())}")
