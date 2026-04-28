import os
import sys
import django

# Set up Django environment
sys.path.append('f:/student portal/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from django.db.models import Count

def get_test_stats():
    total_tests = Test.objects.count()
    stats = Test.objects.values('exam_type__name').annotate(total=Count('id')).order_by('-total')
    
    print(f"Total Tests Created: {total_tests}")
    print("\nTests by Exam Type:")
    print("-" * 30)
    for stat in stats:
        exam_type = stat['exam_type__name'] or "No Exam Type"
        count = stat['total']
        print(f"{exam_type:20} : {count}")

if __name__ == "__main__":
    get_test_stats()
