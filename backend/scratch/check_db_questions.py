import os
import django
import sys

# Add the backend directory to sys.path
sys.path.append(r'f:\student portal\backend')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from questions.models import Question
from master_data.models import ClassLevel

def check_database():
    total_questions = Question.objects.count()
    questions_with_class = Question.objects.filter(class_level__isnull=False).count()
    questions_without_class = Question.objects.filter(class_level__isnull=True).count()

    total_classes = ClassLevel.objects.count()

    print(f"Total Questions: {total_questions}")
    print(f"Questions with Class: {questions_with_class}")
    print(f"Questions without Class: {questions_without_class}")
    print(f"Total ClassLevel objects: {total_classes}")

    if total_classes > 0:
        print("\nAvailable Classes:")
        for cl in ClassLevel.objects.all()[:5]:
            print(f"- {cl.name} (ID: {cl.pk})")

    if total_questions > 0:
        sample_q = Question.objects.first()
        print(f"\nSample Question raw data:")
        print(f"ID: {sample_q._id}")
        print(f"class_level_id: {getattr(sample_q, 'class_level_id', 'N/A')}")
        print(f"subject_id: {getattr(sample_q, 'subject_id', 'N/A')}")
        print(f"topic_id: {getattr(sample_q, 'topic_id', 'N/A')}")
        
        # Stats on metadata
        with_subject = Question.objects.filter(subject__isnull=False).count()
        with_topic = Question.objects.filter(topic__isnull=False).count()
        with_chapter = Question.objects.filter(chapter__isnull=False).count()

        print(f"\nMetadata Distribution:")
        print(f"With Subject: {with_subject}")
        print(f"With Topic: {with_topic}")
        print(f"With Chapter: {with_chapter}")

        # Check if there's any question with a class_level
        any_q_with_class = Question.objects.exclude(class_level=None).first()
        if any_q_with_class:
            print(f"\nFound a question WITH class:")
            print(f"ID: {any_q_with_class._id}")
            print(f"Class: {any_q_with_class.class_level.name}")
        else:
            print("\nConfirmed: No question has a class_level assigned in the current queryset.")

if __name__ == "__main__":
    check_database()
