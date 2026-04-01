import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test, TestCentreAllotment

def check_test_status():
    tests = Test.objects.all()
    print(f"Total Tests: {tests.count()}")
    for t in tests:
        # Check all centre allotments for this test
        allotments = TestCentreAllotment.objects.filter(test=t)
        if not allotments.exists():
            print(f"Test {t.name}: No centre allotted")
            continue
            
        all_over = True
        latest_end = None
        for a in allotments:
            if not a.end_time or a.end_time > timezone.now():
                all_over = False
            if a.end_time:
                if not latest_end or a.end_time > latest_end:
                    latest_end = a.end_time
        
        print(f"Test {t.name}:")
        print(f"  Allotments: {allotments.count()}")
        print(f"  All Over: {all_over}")
        print(f"  Latest End: {latest_end}")

if __name__ == "__main__":
    check_test_status()
