import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
t = Test.objects.get(name="2026-28 PHASE TEST 01")
print(f"Test: {t.name}")
for sec in t.allotted_sections.all():
    qs_count = sec.questions.count()
    qs_set = len(set(q.pk for q in sec.questions.all()))
    order_len = len(sec.question_order or [])
    print(f"  Sec: {sec.name} | qs_count={qs_count} | qs_set={qs_set} | order_len={order_len} | cm={sec.correct_marks}")

