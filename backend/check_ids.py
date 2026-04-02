import os
import django
from bson import ObjectId
import json
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def clean_html(text):
    if not text: return ""
    return re.sub('<[^<]+?>', '', str(text)).strip().lower()

from api.db_utils import get_db
from tests.models import Test

db = get_db()
enrollment = "PATH26002030"
test_id = 18

test = Test.objects.get(pk=test_id)
# Simulate List View's q_map building
sections = test.allotted_sections.all()
q_map = {}
seen = set()
for sec in sections:
    print(f"Building map for section: {sec.name}")
    qs = list(sec.questions.all())
    for q in qs:
        qid = str(q.pk)
        if qid not in seen:
            seen.add(qid)
            q_map[qid] = {
                'section': sec.name,
                'correct': float(sec.correct_marks or 0),
                'negative': float(sec.negative_marks or 0),
                'type': q.question_type or 'SINGLE_CHOICE'
            }

print(f"Total Unique Questions in Map: {len(q_map)}")
for qid in q_map.keys():
    print(f" - {qid}")

# Simulate student's responses
sub = db['tests_testsubmission'].find_one({'test_id': test_id, 'student_id': enrollment})
if sub:
    responses = sub.get('responses', {})
    if isinstance(responses, str):
        responses = json.loads(responses)
    
    print(f"Student Responses (keys): {list(responses.keys())}")
    
    total_found = 0
    for qid in q_map.keys():
        res = responses.get(qid)
        if res is None:
            try: res = responses.get(int(qid))
            except: pass
        if res:
            total_found += 1
            print(f"Matched QID {qid}")
    
    print(f"Total Matched: {total_found}")
else:
    print("No sub.")
