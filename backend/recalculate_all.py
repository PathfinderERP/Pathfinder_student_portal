import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from api.db_utils import get_db

db = get_db()
if db is None:
    print("No DB")
    exit(1)

from tests.views import clean_html

tests = Test.objects.prefetch_related('allotted_sections').all()
count_updated = 0

for test in tests:
    try:
        from bson import ObjectId
        try: t_pk = ObjectId(test.pk)
        except: t_pk = test.pk
        
        subs = list(db['tests_testsubmission'].find({'test_id': t_pk}))
        if not subs: continue
        
        # Build map
        q_map = {}
        sections = list(test.allotted_sections.all().order_by('priority'))
        for sec in sections:
            for q in sec.questions.all():
                q_id = str(q.pk)
                q_map[q_id] = {
                    'correct_marks': float(sec.correct_marks or 0),
                    'negative_marks': float(sec.negative_marks or 0),
                    'type': q.question_type or 'SINGLE_CHOICE',
                    'options': q.question_options or [],
                    'correct_options': [str(opt['id']) for opt in (q.question_options or []) if opt.get('isCorrect')],
                    'answer_from': float(q.answer_from) if getattr(q, 'answer_from', None) is not None else None,
                    'answer_to': float(q.answer_to) if getattr(q, 'answer_to', None) is not None else None,
                }
                
        for sub in subs:
            raw_res = sub.get('responses') or {}
            if isinstance(raw_res, str):
                try: raw_res = json.loads(raw_res)
                except: raw_res = {}
            responses = raw_res if isinstance(raw_res, dict) else {}
            
            s_score = 0.0
            
            # Recalculate correctly using section traversal
            # Since student_results iterates over sections, we do the same
            for sec in sections:
                seen_in_sec = set()
                for q in sec.questions.all():
                    q_id = str(q.pk)
                    if q_id in seen_in_sec: continue
                    seen_in_sec.add(q_id)
                    
                    q_info = q_map[q_id]
                    res_obj = responses.get(q_id)
                    if res_obj is None:
                        try: res_obj = responses.get(int(q_id))
                        except: pass
                    
                    ans = res_obj.get('answer') if isinstance(res_obj, dict) else res_obj
                    if ans in (None, '', [], {}): continue
                    
                    earned = 0
                    neg = 0
                    q_type = q_info['type']
                    
                    if q_type == 'SINGLE_CHOICE':
                        ans_str = str(ans).strip().lower()
                        clean_ans = clean_html(ans)
                        is_correct = False
                        keys = ['a', 'b', 'c', 'd', 'e', 'f']
                        for oi, opt in enumerate(q_info.get('options', [])):
                            opt_id = str(opt.get('id', ''))
                            opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                            opt_label = keys[oi] if oi < len(keys) else None
                            if ans_str == opt_id or clean_ans == opt_content or (opt_label and ans_str == opt_label):
                                if opt.get('isCorrect'): is_correct = True
                                break
                        if not is_correct:
                            try:
                                idx = int(ans_str)
                                if idx < len(q_info.get('options', [])) and q_info['options'][idx].get('isCorrect'): is_correct = True
                            except: pass
                        if is_correct: earned = q_info['correct_marks']
                        else: neg = q_info['negative_marks']
                        
                    elif q_type == 'MULTI_CHOICE':
                        raw_selected = ans if isinstance(ans, list) else [ans]
                        normalized_selected = set()
                        keys = ['a', 'b', 'c', 'd', 'e', 'f']
                        for item in raw_selected:
                            item_str = str(item).strip().lower()
                            for oi, opt in enumerate(q_info.get('options', [])):
                                opt_id = str(opt.get('id', ''))
                                opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                                opt_label = keys[oi] if oi < len(keys) else None
                                if item_str == opt_id or item_str == opt_content or (opt_label and item_str == opt_label):
                                    normalized_selected.add(opt_id)
                                    break
                        correct = set(q_info['correct_options'])
                        if normalized_selected == correct: earned = q_info['correct_marks']
                        elif normalized_selected & correct:
                            fraction = len(normalized_selected & correct) / len(correct) if correct else 0
                            earned = round(q_info['correct_marks'] * fraction, 2)
                        else: neg = q_info['negative_marks']
                        
                    elif q_type in ('NUMERICAL', 'INTEGER_TYPE'):
                        try:
                            val = float(ans)
                            if q_info.get('answer_from') is not None and q_info.get('answer_to') is not None:
                                if q_info['answer_from'] <= val <= q_info['answer_to']: earned = q_info['correct_marks']
                                else: neg = q_info['negative_marks']
                        except: neg = q_info['negative_marks']
                    
                    s_score += (earned - neg)
            
            # Update DB with correctly calculated score
            s_score = round(s_score, 2)
            db['tests_testsubmission'].update_one(
                {'_id': sub['_id']},
                {'$set': {'score': s_score}}
            )
            count_updated += 1
    except Exception as e:
        print(f"Error test {test.name}: e")

print(f"Updated {count_updated} submissions with proper recalculation logic.")
