import os
import django
import json
from bson import ObjectId

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test, TestSubmission
from questions.models import Question
from api.db_utils import get_db

t = Test.objects.filter(name__icontains='PHASE TEST 01').first()
if not t:
    print("Test not found")
    exit()

print(f"Test ID: {t.pk}, Name: {t.name}, Code: {t.code}")

db = get_db()
if db is None:
    print("DB not available")
    exit()

# Get all submissions for this test
sub_docs = list(db['tests_testsubmission'].find({'test_id': t.pk, 'is_finalized': True}))
print(f"Found {len(sub_docs)} finalized submissions")

# Let's inspect ONE submission's responses
if sub_docs:
    s = sub_docs[0]
    res = s.get('responses')
    if isinstance(res, str):
        res = json.loads(res)
    print(f"Sample response structure for first question id in sub: {next(iter(res.items())) if res else 'No responses'}")

# Now let's look at the sections and questions
for sec in t.allotted_sections.all():
    print(f"\nSection: {sec.name}")
    for q in sec.questions.all():
        if "The terminal respiration occurs" in (q.content or ""):
            print(f"Found target question: ID={q.pk}, type={q.question_type}")
            print(f"Options: {q.question_options}")
            correct_opts = [str(opt['id']) for opt in (q.question_options or []) if opt.get('isCorrect')]
            print(f"Correct Options: {correct_opts}")
            
            # Count how many students answered what for THIS question
            q_id = str(q.pk)
            answers = []
            for doc in sub_docs:
                r = doc.get('responses') or {}
                if isinstance(r, str): r = json.loads(r)
                ans = r.get(q_id)
                if isinstance(ans, dict): ans = ans.get('answer')
                if ans is not None:
                    answers.append(ans)
            
            print(f"Answers received: {answers}")
            correct_count = sum(1 for a in answers if str(a) in correct_opts)
            print(f"Count of answers in correct_opts: {correct_count}")
