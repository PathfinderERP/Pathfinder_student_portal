import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from master_data.models import Session, ClassLevel, TargetExam, ExamType, ExamDetail

def create_exam_details():
    # Helper to get or create related objects
    def get_session(name):
        return Session.objects.filter(name=name).first()
    
    def get_class(name):
        return ClassLevel.objects.filter(name__icontains=name).first()

    def get_target(name):
        target, _ = TargetExam.objects.get_or_create(name=name, defaults={'is_active': True})
        return target

    def get_type(name):
        etype, _ = ExamType.objects.get_or_create(name=name, defaults={'is_active': True})
        return etype

    exams = [
        {
            'name': 'tests2', 'code': 'SDFSDF', 'session': '2026-2028', 'class_name': 'REPEATER', 
            'target': 'DEMO', 'type': 'DEMO EXAM', 'marks': 85, 'duration': 180
        },
        {
            'name': 'DEMO CLAP EXAM', 'code': 'DEMO_EXAM', 'session': '2026-2027', 'class_name': 'DEMO', 
            'target': 'DEMO', 'type': 'DEMO EXAM', 'marks': 40, 'duration': 35
        },
        {
            'name': 'FOUNDATION CLASS 10 CLAP TEST 10', 'code': 'CLASS_10_CLAPTEST_10', 'session': '2026-2027', 'class_name': '10', 
            'target': 'FOUNDATION', 'type': 'FOUNDATION', 'marks': 40, 'duration': 35
        },
        {
            'name': 'FOUNDATION CLASS 10 CLAP TEST 9', 'code': 'CLASS_10_CLAPTEST_9', 'session': '2026-2027', 'class_name': '10', 
            'target': 'FOUNDATION', 'type': 'FOUNDATION', 'marks': 40, 'duration': 35
        },
        {
            'name': 'FOUNDATION CLASS 10 CLAP TEST 8', 'code': 'CLASS_10_CLAPTEST_8', 'session': '2026-2027', 'class_name': '10', 
            'target': 'FOUNDATION', 'type': 'FOUNDATION', 'marks': 40, 'duration': 35
        },
        {
            'name': 'FOUNDATION CLASS 10 CLAP TEST 7', 'code': 'CLASS_10_CLAPTEST_7', 'session': '2026-2027', 'class_name': '10', 
            'target': 'FOUNDATION', 'type': 'FOUNDATION', 'marks': 40, 'duration': 35
        },
        {
            'name': 'FOUNDATION CLASS 10 CLAP TEST 6', 'code': 'CLASS_10_CLAPTEST_6', 'session': '2026-2027', 'class_name': '10', 
            'target': 'FOUNDATION', 'type': 'FOUNDATION', 'marks': 40, 'duration': 35
        }
    ]

    for exam in exams:
        sess = get_session(exam['session'])
        cl = get_class(exam['class_name'])
        if not cl:
            cl, _ = ClassLevel.objects.get_or_create(name=exam['class_name'])
        
        if sess and cl:
            target = get_target(exam['target'])
            etype = get_type(exam['type'])
            
            ExamDetail.objects.get_or_create(
                code=exam['code'],
                defaults={
                    'name': exam['name'],
                    'session': sess,
                    'class_level': cl,
                    'target_exam': target,
                    'exam_type': etype,
                    'total_marks': exam['marks'],
                    'duration': exam['duration']
                }
            )
    print(f"Recreated Exam Details. Total: {ExamDetail.objects.count()}")

if __name__ == '__main__':
    create_exam_details()
