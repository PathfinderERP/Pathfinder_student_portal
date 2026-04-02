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
subs = list(db['tests_testsubmission'].find({'test_id': t.pk, 'is_finalized': True}))

for s in subs:
    res = s.get('responses') or {}
    if isinstance(res, str): res = json.loads(res)
    q_id = '69babf6c3c8582575fe78185'
    val = res.get(q_id)
    ans = val.get('answer') if isinstance(val, dict) else val
    print(f"Student {s.get('student_id')} -> Q5 Ans: {ans}")
