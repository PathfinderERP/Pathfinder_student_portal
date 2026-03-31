import os
import django
from django.db.models import Count

# Set settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser

def get_stats():
    total_students = CustomUser.objects.filter(user_type='student').count()
    print(f"Total students: {total_students}")
    
    # Students with exam_section
    students_with_exam_section = CustomUser.objects.filter(user_type='student').exclude(exam_section__isnull=True).exclude(exam_section="").count()
    print(f"Students with exam_section: {students_with_exam_section}")
    
    # Students with study_section
    students_with_study_section = CustomUser.objects.filter(user_type='student').exclude(study_section__isnull=True).exclude(study_section="").count()
    print(f"Students with study_section: {students_with_study_section}")
    
    # Exam Sections counts
    exam_sections = CustomUser.objects.filter(user_type='student').values('exam_section').annotate(count=Count('exam_section')).order_by('-count')
    print("\nExam Sections Found:")
    for section in exam_sections:
        name = section['exam_section']
        count = section['count']
        if name:
            print(f"- {name}: {count}")

    # Study Sections counts
    study_sections = CustomUser.objects.filter(user_type='student').values('study_section').annotate(count=Count('study_section')).order_by('-count')
    print("\nStudy Sections Found:")
    for section in study_sections:
        name = section['study_section']
        count = section['count']
        if name:
            print(f"- {name}: {count}")

if __name__ == "__main__":
    get_stats()
