import os
import sys
import django

# Set up Django environment
sys.path.append('f:/student portal/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test

def list_all_tests():
    tests = Test.objects.all().select_related('exam_type').order_by('exam_type__name', 'name')
    
    print(f"{'Test Name':40} | {'Exam Type':20}")
    print("-" * 65)
    for t in tests:
        exam_type = t.exam_type.name if t.exam_type else "No Exam Type"
        print(f"{t.name:40} | {exam_type:20}")

if __name__ == "__main__":
    list_all_tests()
