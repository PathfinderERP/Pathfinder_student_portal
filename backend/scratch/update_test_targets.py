import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from master_data.models import TargetExam

target = TargetExam.objects.filter(name='NEET').first()
if target:
    tests = Test.objects.filter(name__icontains='FOUNDATION CLASS 7')
    count = 0
    for t in tests:
        t.target_exam = target
        t.save()
        count += 1
    print(f"Updated {count} Foundation Class 7 tests to NEET")
else:
    print("NEET target not found")
