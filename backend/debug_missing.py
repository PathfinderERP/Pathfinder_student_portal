import os
import django
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from api.db_utils import get_db
from django.contrib.auth import get_user_model
from tests.models import Test

print("Starting debug...", flush=True)
u = get_user_model().objects.filter(first_name__icontains="Ambarish").first()
if not u:
    print("User not found", flush=True)
    sys.exit(0)

test_id = 18
test = Test.objects.get(pk=test_id)
db = get_db()
sub = db['tests_testsubmission'].find_one({'test_id': test_id, 'student_id': u.pk})

if not sub:
    print(f"No submission found for {u.username}", flush=True)
    sys.exit(0)

responses = sub.get('responses', {})
print(f"Total responses in doc: {len(responses)}", flush=True)

# Simulate List View map building
sections = test.allotted_sections.all()
q_map = {}
for sec in sections:
    for q in sec.questions.all():
        q_map[str(q.pk)] = sec.name

print(f"Total questions in test structure: {len(q_map)}", flush=True)

matched = 0
missing = []
for qid in responses.keys():
    if qid in q_map:
        matched += 1
    else:
        missing.append(qid)

print(f"Matched: {matched}", flush=True)
print(f"Missing QIDs: {missing}", flush=True)
