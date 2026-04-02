import os
import django
import json
from bson import ObjectId

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from api.db_utils import get_db

t = Test.objects.filter(code='PT01').first()
if not t:
    print("Test not found")
    exit()

print(f"Test: {t.name}")
for sec in t.allotted_sections.all():
    print(f"Section: {sec.name}")
    for q in sec.questions.all():
        correct_opts = [str(opt['id']) for opt in (q.question_options or []) if opt.get('isCorrect')]
        print(f"  Q: id={q.pk}, type={q.question_type}, CorrectOpts={correct_opts}, Content Start: {(q.content or '')[:30]}")

db = get_db()
subs = list(db['tests_testsubmission'].find({'test_id': t.pk, 'is_finalized': True}))
print(f"Submissions count: {len(subs)}")
for s in subs[:1]:
    res = s.get('responses') or {}
    if isinstance(res, str): res = json.loads(res)
    print(f"  Sub Student: {s.get('student_id')}, Response Keys: {list(res.keys())}")
    for qid, val in res.items():
        ans = val.get('answer') if isinstance(val, dict) else val
        print(f"    Q {qid} -> {ans}")
