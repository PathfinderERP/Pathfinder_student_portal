import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from tests.models import Test
test = Test.objects.get(pk=18)
for sec in test.allotted_sections.all():
    print(f"Section: {sec.name} | Correct: {sec.correct_marks} | Negative: {sec.negative_marks} | Q Count: {len(sec.questions.all())}")
