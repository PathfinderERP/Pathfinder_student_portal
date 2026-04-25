import os
import django
import sys

sys.path.append(r'f:\student portal\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test

def check_tests():
    total_tests = Test.objects.count()
    tests_with_class = Test.objects.filter(class_level__isnull=False).count()
    tests_with_exam = Test.objects.filter(exam_type__isnull=False).count()
    
    print(f"Total Tests: {total_tests}")
    print(f"Tests with Class: {tests_with_class}")
    print(f"Tests with Exam Type: {tests_with_exam}")
    
    if total_tests > 0:
        sample = Test.objects.first()
        print(f"\nSample Test: {sample.name}")
        print(f"Class: {sample.class_level.name if sample.class_level else 'None'}")
        print(f"Exam Type: {sample.exam_type.name if sample.exam_type else 'None'}")
        print(f"Sections count: {sample.sections.count()}")

if __name__ == "__main__":
    check_tests()
