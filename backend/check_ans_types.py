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
if not t or db is None:
    print("Error")
    exit()

sub = db['tests_testsubmission'].find_one({'test_id': t.pk, 'is_finalized': True})
if sub:
    res = sub.get('responses') or {}
    if isinstance(res, str): res = json.loads(res)
    for q_id, q_val in list(res.items())[:5]:
        answer = q_val.get('answer') if isinstance(q_val, dict) else q_val
        print(f"Q: {q_id}, Ans Type: {type(answer)}, Value: {answer}")
else:
    print("No submissions")
