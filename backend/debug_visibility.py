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
    print(f"Exam Section (Raw): {getattr(user, 'exam_section', 'N/A')}")
    print(f"Study Section (Raw): {getattr(user, 'study_section', 'N/A')}")
    
    exam_sections = parse_section(getattr(user, 'exam_section', ''))
    study_sections = parse_section(getattr(user, 'study_section', ''))
    allowed_names = list(set([n.strip() for n in exam_sections + study_sections if n and str(n).strip()]))
    
    print(f"Parsed Allowed Names: {allowed_names}")
    
    db = get_db()
    if db is not None:
        section_docs = list(db['sections_section'].find({'name': {'$in': allowed_names}}, {'name': 1}))
        print(f"Sections found in DB: {[d['name'] for d in section_docs]}")
        
        m_section_ids = [doc['_id'] for doc in section_docs]
        if m_section_ids:
            m2m_docs = list(db['tests_test_allotted_sections'].find({'section_id': {'$in': m_section_ids}}, {'test_id': 1}))
            test_ids = {doc['test_id'] for doc in m2m_docs}
            print(f"Allotted Test IDs: {test_ids}")
            
            from tests.models import Test
            tests = Test.objects.filter(id__in=list(test_ids))
            print(f"Tests in DB matching those IDs: {[t.name for t in tests]}")

if __name__ == "__main__":
    inspect_student("fortwilliam1@gmail.com")
