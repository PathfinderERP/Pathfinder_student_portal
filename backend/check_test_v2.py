import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
print("Django setup OK")
from tests.models import Test, TestSubmission
from api.models import CustomUser

test_code = '26-27WUT1'
try:
    test = Test.objects.filter(code__icontains='27WUT1').first()
    if not test:
        print("No match for 27WUT1")
        exit()
    print(f"Test matched: {test.name} (PK: {test.pk})")
    subs = TestSubmission.objects.filter(test=test)
    print(f"Submissions count: {subs.count()}")
    for s in subs:
        print(f"Student PK: {s.student_id}")
        u = CustomUser.objects.filter(pk=s.student_id).first()
        if u:
            print(f"Username: {u.username}, Centre: {u.centre_code} / {u.centre_name}")
        else:
            print("Student not found in CustomUser table")
except Exception as e:
    print(f"Error: {e}")
