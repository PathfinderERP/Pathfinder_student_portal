import os
import django
import json
from bson import ObjectId

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from api.db_utils import get_db

t = Test.objects.filter(code='PT01').first()

db = get_db()
submissions = list(db['tests_testsubmission'].find({'test_id': t.pk, 'is_finalized': True}))
all_scores = []
from bs4 import BeautifulSoup
def clean_html(text): return str(text)

# Let's see the ranks in student_results logic vs student_performance logic exactly
from tests.views import TestViewSet
viewset = TestViewSet()
viewset.kwargs = {'pk': t.pk}
viewset.get_object = lambda: t
class DummyRequest:
    def __init__(self, e):
        class QP:
            def get(self, k, d=None): return e
        self.query_params = QP()

res = viewset.student_results(request=None)
print("LEADERBOARD API:")
for st in res.data['students']:
    print(f"Name: {st['name']} - Marks: {st['marks']} - Rank: {st['rank']}")

print("\nPERFORMANCE API RECALCULATION LOOP FOR HO EASTERN:")
req = DummyRequest("PATH26001649")
r2 = viewset.student_performance(request=req)
print(f"HO EASTERN RETURNED RANK: {r2.data.get('rank')} SCORE: {r2.data.get('score')}")

from api.models import CustomUser
sub_doc = submissions[0]
print(f"\nStudent ID of HO Eastern is {(CustomUser.objects.get(admission_number='PATH26001649')).pk}")

