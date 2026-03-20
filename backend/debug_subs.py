import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test, TestSubmission
from api.models import CustomUser

test_id = '67d93425cb92d348a0026e95' # Need to find the actual ID for test 18
# Actually, if the URL is /api/tests/18/, PK is 18.
try:
    test = Test.objects.get(pk=18)
except:
    test = Test.objects.first()

print(f"DEBUG: Test: {test.name} (PK: {test.pk})")
subs = TestSubmission.objects.filter(test=test)
print(f"DEBUG: Total Submissions: {len(subs)}")

for i, sub in enumerate(subs):
    student = sub.student
    print(f"DEBUG {i+1}: Student {student.username} (PK: {student.pk})")
    print(f"   - Admission: {student.admission_number}")
    print(f"   - Section: {student.exam_section}")
    print(f"   - Centre: {student.centre_code} / {student.centre_name}")

print("\nDEBUG: Running the get_total_students filter:")
from django.db.models import Q
count = TestSubmission.objects.filter(test=test).filter(
    Q(student__admission_number__isnull=False) & ~Q(student__admission_number='') |
    Q(student__exam_section__isnull=False) & ~Q(student__exam_section='')
).count()
print(f"DEBUG: Filter Result Count: {count}")
