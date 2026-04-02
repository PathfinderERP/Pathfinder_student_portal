import os
import django
import json
from bson import ObjectId

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from tests.views import TestViewSet

class DummyRequest:
    def __init__(self, e):
        class QP:
            def get(self, k, d=None): return e
        self.query_params = QP()

t = Test.objects.filter(name__icontains='PHASE TEST 01').first()

viewset = TestViewSet()
viewset.kwargs = {'pk': t.pk}
viewset.get_object = lambda: t

# Path for HO Eastern
req = DummyRequest("PATH26001649")
res_perf = viewset.student_performance(request=req)

print("HO EASTERN returned rank:", res_perf.data.get('rank'))
print("Let's copy the scored_docs logic here to see what it is doing!")

