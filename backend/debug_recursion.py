import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from api.models import CustomUser
from api.db_utils import parse_section
from django.db.models import Q

def test_query():
    try:
        user = CustomUser.objects.filter(user_type='student', exam_section__isnull=False).exclude(exam_section='').first()
        if not user:
            print("No student found with exam_section")
            return
            
        print(f"Testing for user: {user.username}")
        exam_sections = parse_section(user.exam_section)
        print(f"Sections: {exam_sections}")
        
        print("Executing Test.objects.filter(allotted_sections__name__in=exam_sections)")
        tests = Test.objects.filter(allotted_sections__name__in=exam_sections)
        print(f"Tests count: {tests.count()}")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_query()
