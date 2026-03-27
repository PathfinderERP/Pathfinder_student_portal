import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test, TestSubmission
from api.models import CustomUser

t = Test.objects.filter(name__icontains='2026-28 PHASE TEST 01').first()
u = CustomUser.objects.filter(email='fortwilliam1@gmail.com').first()
sub = TestSubmission.objects.filter(test=t, student=u).first()

print(f'Test: {t.name}')
print(f'User: {u.username}')
print(f'Submission exists: {sub is not None}')
if sub:
    print(f'Submission Type: {sub.submission_type}')
    print(f'Finalized: {sub.is_finalized}')
    print(f'Allow Resume: {sub.allow_resume}')
