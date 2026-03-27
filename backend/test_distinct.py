import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test, TestSubmission
from api.models import CustomUser
from django.db.models import Q

u = CustomUser.objects.filter(email='fortwilliam1@gmail.com').first()
print(f"User: {u.username}")

exam_section = u.exam_section or ""
study_section = u.study_section or ""
allowed_names = [n.strip() for n in [exam_section, study_section] if n]
print(f"Allowed names: {allowed_names}")

section_tests = Q()
for name in allowed_names:
    section_tests |= Q(allotted_sections__name__iexact=name)

sub_ids = TestSubmission.objects.filter(student=u).values_list('test_id', flat=True)
interacted_tests = Q(id__in=sub_ids)

q = Test.objects.filter(section_tests | interacted_tests)
print(f"Initial Count: {q.count()}")
for test in q:
    print(f"- {test.name} (PK: {test.pk})")

try:
    d = q.distinct()
    print(f"Distinct Count: {d.count()}")
    for test in d:
        print(f"- Distinct: {test.name}")
except Exception as e:
    print(f"Distinct Failed: {e}")
