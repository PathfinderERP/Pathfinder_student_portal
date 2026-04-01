import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from tests.models import Test, TestSubmission
from api.models import CustomUser

test_code = '26-27WUT1'
try:
    test = Test.objects.get(code=test_code)
    print(f"Test: {test.name} (PK: {test.pk})")
except Test.DoesNotExist:
    print(f"Test not found: {test_code}")
    exit()

subs = TestSubmission.objects.filter(test=test)
print(f"Submissions for this test: {subs.count()}")
for sub in subs:
    student = sub.student
    print(f"Student: {student.username} (PK: {student.pk})")
    print(f"  Centre: {student.centre_code} / {student.centre_name}")
    print(f"  Sections: {student.exam_section} / {student.study_section}")
