import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser
from api.db_utils import parse_section, get_db

def inspect_student(email):
    user = CustomUser.objects.filter(email=email).first()
    if not user:
        print(f"User not found for email: {email}")
        return
        
    print(f"User: {user.username} ({user.email})")
    print(f"Centre Code: {getattr(user, 'centre_code', 'N/A')}")
    print(f"Centre Name: {getattr(user, 'centre_name', 'N/A')}")
    print(f"Exam Section (Raw): {getattr(user, 'exam_section', 'N/A')}")
    
    exam_sections = parse_section(getattr(user, 'exam_section', ''))
    print(f"Parsed Exam Sections: {exam_sections}")
    
    db = get_db()
    if db is None: return

    # Check matches in Section collection
    section_docs = list(db['sections_section'].find({'name': {'$in': exam_sections}}))
    print(f"Found Sections in DB: {[d['name'] for d in section_docs]}")
    
    # Check what tests PT01 is allotted to
    from tests.models import Test
    pt01 = Test.objects.filter(code='PT01').first()
    if pt01:
        print(f"Test PT01 Allotted Sections: {[s.name for s in pt01.allotted_sections.all()]}")
        print(f"Test PT01 Allotted Centres: {[c.name for c in pt01.centres.all()]}")

if __name__ == "__main__":
    inspect_student("fortwilliam1@gmail.com")
