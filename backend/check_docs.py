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

print("scored_docs from Malak's API call:")
# I need to modify the view locally or just copy the logic.
# Wait, let's just make a modified copy of the `scored_docs` generation:
db = get_db()
submissions = list(db['tests_testsubmission'].find({'test_id': t.pk, 'is_finalized': True}))
all_scores = []
from bs4 import BeautifulSoup
def clean_html(text): return str(text) # Simplified for test

# I clearly saw that student_results and student_performance have DIFFERENT scores in `scored_docs`.
