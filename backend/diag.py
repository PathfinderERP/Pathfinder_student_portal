import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
tests = Test.objects.all()

for t in tests:
    print(f"Test: {t.name}")
    s1 = 0
    s2 = 0
    for sec in t.allotted_sections.all():
        qs_count = sec.questions.count()
        order_len = len(sec.question_order or [])
        m1 = qs_count * float(sec.correct_marks or 0)
        m2 = order_len * float(sec.correct_marks or 0)
        s1 += m1
        s2 += m2
        print(f"  Sec: {sec.name} | qs_count={qs_count} | order_len={order_len} | cm={sec.correct_marks}")
    print(f"  Total by qs_count: {s1} | Total by order_len: {s2}")

