import os
import django
import sys

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test

def inspect_questions_18():
    test_id = 18
    try:
        test = Test.objects.get(pk=test_id)
        print(f"Test: {test.name}")
        for sec in test.allotted_sections.all():
            print(f"\nSection: {sec.name}")
            for q in sec.questions.all()[:2]:
                print(f"  Q Type: {q.question_type}")
                print(f"  Options: {q.question_options}")
                # Check for isCorrect flag
                corrects = [opt.get('id') for opt in (q.question_options or []) if opt.get('isCorrect')]
                print(f"  Correct IDs: {corrects}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_questions_18()
