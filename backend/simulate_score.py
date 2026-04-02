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
sub = db['tests_testsubmission'].find_one({'test_id': test_id, 'student_id': enrollment})

if sub:
    responses = sub.get('responses', {})
    if isinstance(responses, str):
        responses = json.loads(responses)
    
    print(f"Testing Student: {enrollment}")
    sections = test.allotted_sections.all().order_by('priority')
    
    total_score = 0
    for sec in sections:
        print(f"--- Section: {sec.name} ---")
        qs = list(sec.questions.all())
        sec_score = 0
        for i, q in enumerate(qs):
            # Simulation of current backend logic
            qid = str(q.pk)
            ans = responses.get(qid)
            ans_str = str(ans).strip().lower()
            clean_ans = clean_html(ans)
            
            is_correct = False
            keys = ['a', 'b', 'c', 'd', 'e', 'f']
            correct_options = [str(opt['id']) for opt in (q.question_options or []) if opt.get('isCorrect')]
            
            for oi, opt in enumerate(q.question_options or []):
                opt_id = str(opt.get('id', ''))
                opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                opt_label = keys[oi] if oi < len(keys) else None
                
                if ans_str == opt_id or clean_ans == opt_content or (opt_label and ans_str == opt_label):
                    if opt.get('isCorrect'):
                        is_correct = True
                        print(f"  Match Found (Correct)! Q{i+1}: Picked={repr(ans)}")
                    else:
                        print(f"  Match Found (Wrong)! Q{i+1}: Picked={repr(ans)}")
                    break
            else:
                # No match found
                # Index fallback
                try:
                    idx = int(ans_str)
                    if idx < len(q.question_options) and q.question_options[idx].get('isCorrect'):
                        is_correct = True
                        print(f"  Index Match (Correct)! Q{i+1}")
                    else:
                        print(f"  Index Match (Wrong) or No Match for Q{i+1}: Picked={repr(ans)}")
                except:
                    print(f"  NO MATCH at all for Q{i+1}: Picked={repr(ans)}")

            if is_correct:
                sec_score += float(sec.correct_marks or 0)
            elif ans not in (None, '', [], {}):
                sec_score -= float(sec.negative_marks or 0)
        
        print(f"Section {sec.name} Score: {sec_score}")
        total_score += sec_score
    
    print(f"FINAL SIMULATED SCORE: {total_score}")
else:
    print("No submission.")
