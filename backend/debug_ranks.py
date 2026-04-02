import os
import django
import json
from bson import ObjectId

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from api.db_utils import get_db

t = Test.objects.filter(name__icontains='PHASE TEST 01').first()
db = get_db()
submissions = list(db['tests_testsubmission'].find({'test_id': t.pk, 'is_finalized': True}))
print(f"Total Submissions: {len(submissions)}")

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

res_leader = viewset.student_results(request=None)
print("Leaderboard:")
leader_ranks = {}
for stu in res_leader.data.get('students', []):
    print(f" Rank {stu['rank']}: {stu['name']} - Score {stu['marks']}")
    leader_ranks[stu['name']] = stu['rank']

print("\nStudent Performance Ranks:")
for sub in submissions:
    stu_id = sub['student_id']
    from api.models import CustomUser
    u = CustomUser.objects.filter(pk=stu_id).first()
    if u:
        req = DummyRequest(u.admission_number or u.username)
        res_perf = viewset.student_performance(request=req)
        perf_data = res_perf.data
        name = u.first_name + " " + u.last_name
        print(f" {name} -> Rank {perf_data.get('rank')}, Score: {perf_data.get('score')} vs Leaderboard: {leader_ranks.get(name.upper().strip())}")
