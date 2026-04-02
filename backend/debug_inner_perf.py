import os
import django
import json
from bson import ObjectId

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from api.db_utils import get_db

t = Test.objects.filter(name__icontains='PHASE TEST 01').first()

from tests.views import TestViewSet
class DummyRequest:
    def __init__(self, e):
        class QP:
            def get(self, k, d=None): return e
        self.query_params = QP()

viewset = TestViewSet()
viewset.kwargs = {'pk': t.pk}
def get_obj(): return t
viewset.get_object = get_obj

req = DummyRequest("PATH26001040") # Malak Shahid
res_perf = viewset.student_performance(request=req)
print(f"MALAK SHAHID Score: {res_perf.data.get('score')} Rank: {res_perf.data.get('rank')} Percentile: {res_perf.data.get('percentile')}")

req = DummyRequest("PATH26001649") # HO Eastern Command
res_perf2 = viewset.student_performance(request=req)
print(f"HO EASTERN COMMAND Score: {res_perf2.data.get('score')} Rank: {res_perf2.data.get('rank')} Percentile: {res_perf2.data.get('percentile')}")

# Let's see the score distribution logic locally in this script mimicking views.py:
db = get_db()
submissions = list(db['tests_testsubmission'].find({'test_id': t.pk, 'is_finalized': True}))
scores = []
for sub in submissions:
    print(f"Student: {sub['student_id']}, score in DB: {sub.get('score')}")
