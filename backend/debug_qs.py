import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from tests.models import Test
t = Test.objects.get(pk=18)
for sec in t.allotted_sections.all():
    qs = list(sec.questions.all())
    print(f"Sec: {sec.name} | Q Count: {len(qs)}")
    for q in qs:
        print(f"  - {q.pk}")
