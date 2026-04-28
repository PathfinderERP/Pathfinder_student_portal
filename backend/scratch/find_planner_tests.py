import os
import sys
import django

# Set up Django environment
sys.path.append('f:/student portal/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test

def get_study_planner_tests():
    tests = Test.objects.filter(exam_type__name='STUDY PLANNER').values('name', 'code')
    
    print(f"Tests with Exam Type 'STUDY PLANNER':")
    print("-" * 50)
    if not tests:
        print("No tests found.")
    for test in tests:
        print(f"- {test['name']} ({test['code']})")

if __name__ == "__main__":
    get_study_planner_tests()
