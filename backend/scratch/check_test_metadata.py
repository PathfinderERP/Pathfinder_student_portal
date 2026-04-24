import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from master_data.models import Session, ClassLevel, TargetExam

test_name = "FOUNDATION CLASS 7 CLAP TEST 1"
test = Test.objects.filter(name=test_name).first()

if test:
    print(f"Test Found: {test.name}")
    print(f"  Code: {test.code}")
    print(f"  Session: {test.session.name if test.session else 'None'}")
    print(f"  Class Level: {test.class_level.name if test.class_level else 'None'}")
    print(f"  Target Exam: {test.target_exam.name if test.target_exam else 'None'}")
    
    print("\nCentres Allotted:")
    for centre in test.centres.all():
        print(f"  - {centre.name} ({centre.code})")
else:
    print(f"Test '{test_name}' not found.")
