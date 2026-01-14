import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from master_data.models import Session, ExamType, ClassLevel

def populate_dummy_data():
    # Dummy Sessions
    sessions = [
        {'name': '2023-2024', 'code': 'SESS_23_24', 'description': 'Academic session for 2023-24'},
        {'name': '2024-2025', 'code': 'SESS_24_25', 'description': 'Current academic session'},
        {'name': '2025-2026', 'code': 'SESS_25_26', 'description': 'Upcoming academic session'},
    ]
    for s in sessions:
        Session.objects.get_or_create(code=s['code'], defaults=s)
    
    # Dummy Exam Types
    exam_types = [
        {'name': 'Weekly Test', 'code': 'WT', 'description': 'Regular weekly assessments'},
        {'name': 'Monthly Test', 'code': 'MT', 'description': 'End of month evaluations'},
        {'name': 'Mock Test', 'code': 'MOCK', 'description': 'Full syllabus mock exams'},
    ]
    for et in exam_types:
        ExamType.objects.get_or_create(code=et['code'], defaults=et)

    # Dummy Classes
    classes = [
        {'name': 'Class 10', 'code': 'CL_10', 'description': 'Secondary standard'},
        {'name': 'Class 11', 'code': 'CL_11', 'description': 'Higher secondary junior'},
        {'name': 'Class 12', 'code': 'CL_12', 'description': 'Higher secondary senior'},
    ]
    for c in classes:
        ClassLevel.objects.get_or_create(code=c['code'], defaults=c)

    print("Master Data populated successfully!")

if __name__ == '__main__':
    populate_dummy_data()
