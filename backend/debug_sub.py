import os
import django
from bson import ObjectId
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.db_utils import get_db

db = get_db()
enrollment = "PATH26002030"
test_id = 18

sub = db['tests_testsubmission'].find_one({'test_id': test_id, 'student_id': enrollment})
if sub:
    responses = sub.get('responses', {})
    if isinstance(responses, str):
        responses = json.loads(responses)
    
    print(f"Submission found for {enrollment}")
    # Let's find question 5.
    # We need to know which actual Q ID is Q5 in Botany.
    from tests.models import Test
    test = Test.objects.get(pk=test_id)
    botany = test.allotted_sections.get(name='BOTANY')
    qs = list(botany.questions.all())
    # Assuming it's the 5th question in the section.
    for i, q in enumerate(qs):
        qid = str(q.pk)
        ans = responses.get(qid)
        print(f"Index {i+1} | QID: {qid} | Ans: {repr(ans)}")
        if i == 4: # Q5
            print(f"Correct Options: {q.question_options}")
else:
    print("No submission found.")
