from centres.models import Centre
from tests.models import Test
print(f"BEHALA exists: {Centre.objects.filter(name__iexact='BEHALA').exists()}")
tests = Test.objects.filter(exam_type__name='STUDY PLANNER')
for t in tests:
    print(f"Test: {t.name}, Centres: {[c.name for c in t.centres.all()]}")
