import datetime
from django.utils import timezone
from api.db_utils import get_db
from tests.models import Test
from bson import ObjectId
import json
import re

def clean_html(text):
    if not text:
        return ""
    return re.sub(r'<[^>]+>', '', str(text)).strip().lower()

def calculate_swot_data(user):
    # ── PER-USER CACHE (5 minutes) ────────────────────────────────────────────
    from django.core.cache import cache
    cache_key = f"swot_data_{user.pk}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    # ─────────────────────────────────────────────────────────────────────────

    db = get_db()
    if not db:
        return {}

    now = timezone.now()

    # Build student ID variants for MongoDB lookup
    student_id = user.pk
    student_id_variants = [str(student_id)]
    try:
        student_id_variants.append(ObjectId(student_id))
    except Exception:
        pass
    try:
        student_id_variants.append(int(student_id))
    except Exception:
        pass

    # ── OPTIMIZED: Single MongoDB query, fetch section_stats + minimal fields ──
    # We do NOT fetch 'responses' — section_stats has everything we need
    submissions = list(db['tests_testsubmission'].find(
        {'student_id': {'$in': student_id_variants}, 'is_finalized': True},
        {'test_id': 1, 'section_stats': 1, 'responses': 1}  # responses only as fallback
    ))

    if not submissions:
        result = _empty_swot(now, user)
        cache.set(cache_key, result, 300)
        return result

    # ── BATCH FETCH all test objects in ONE SQL query (not N queries) ─────────
    raw_test_ids = [sub.get('test_id') for sub in submissions if sub.get('test_id')]
    int_test_ids = []
    for tid in raw_test_ids:
        try: int_test_ids.append(int(tid))
        except Exception: pass

    tests_map = {}
    if int_test_ids:
        for t in Test.objects.filter(pk__in=int_test_ids).prefetch_related('sections'):
            tests_map[str(t.pk)] = t
    # ─────────────────────────────────────────────────────────────────────────

    def get_subject_name(section_name):
        s_upper = str(section_name).upper()
        if "MATH" in s_upper:
            return "Mathematics"
        elif "PHYS" in s_upper:
            return "Physics"
        elif "CHEM" in s_upper:
            return "Chemistry"
        elif "BIO" in s_upper or "BOTANY" in s_upper or "ZOOLOGY" in s_upper:
            return "Biology"
        return "General"

    # Subject-wise aggregator
    subjects_data = {}

    for sub in submissions:
        tid = str(sub.get('test_id'))

        # ── Fast path: use precomputed section_stats ─────────────────────────
        section_stats = sub.get('section_stats')
        if section_stats and isinstance(section_stats, list) and len(section_stats) > 0:
            for stat in section_stats:
                sec_name = stat.get('name', 'General')
                subject = get_subject_name(sec_name)
                earned = float(stat.get('marks', 0))
                max_marks = float(stat.get('total', 0))

                if subject not in subjects_data:
                    subjects_data[subject] = {
                        'earned': 0.0, 'max': 0.0,
                        'correct': 0, 'attempted': 0,
                        'time_spent': 0, 'q_count': 0
                    }
                subjects_data[subject]['earned'] += earned
                subjects_data[subject]['max'] += max_marks
                # Approximate: assume answered if score > 0
                if earned > 0:
                    subjects_data[subject]['correct'] += 1
                    subjects_data[subject]['attempted'] += 1
            continue  # Skip slow fallback entirely

        # ── Slow fallback: compute from responses for older records ──────────
        test = tests_map.get(tid)
        if not test:
            continue

        responses = sub.get('responses', {})
        if isinstance(responses, str):
            try:
                responses = json.loads(responses)
            except Exception:
                responses = {}

        sections = test.sections.all()
        for sec in sections:
            correct_marks = float(sec.correct_marks or 0.0)
            negative_marks = float(sec.negative_marks or 0.0)
            subject = get_subject_name(sec.name)

            if subject not in subjects_data:
                subjects_data[subject] = {
                    'earned': 0.0, 'max': 0.0,
                    'correct': 0, 'attempted': 0,
                    'time_spent': 0, 'q_count': 0
                }

            sub_data = subjects_data[subject]
            for q in sec.questions.all():
                qid = str(q.pk)
                res_obj = responses.get(qid)
                if res_obj is None:
                    try:
                        res_obj = responses.get(int(qid))
                    except Exception:
                        pass

                ans = res_obj.get('answer') if isinstance(res_obj, dict) else res_obj
                q_time = res_obj.get('time', 0) if isinstance(res_obj, dict) else 0

                sub_data['max'] += correct_marks
                sub_data['time_spent'] += q_time
                sub_data['q_count'] += 1

                if ans not in (None, '', [], {}):
                    sub_data['attempted'] += 1
                    qtype = q.question_type or 'SINGLE_CHOICE'

                    if qtype == 'SINGLE_CHOICE':
                        ans_str = str(ans).strip()
                        is_correct = False
                        for opt in (q.question_options or []):
                            if ans_str.lower() == str(opt.get('id', '')).lower():
                                if opt.get('isCorrect'):
                                    is_correct = True
                                break
                        if is_correct:
                            sub_data['earned'] += correct_marks
                            sub_data['correct'] += 1
                        else:
                            sub_data['earned'] -= negative_marks

                    elif qtype == 'MULTI_CHOICE':
                        raw_selected = ans if isinstance(ans, list) else [ans]
                        options = q.question_options or []
                        correct_options = set(str(o.get('id', '')) for o in options if o.get('isCorrect'))
                        normalized = set()
                        for item in raw_selected:
                            item_str = str(item).strip().lower()
                            for opt in options:
                                if item_str == str(opt.get('id', '')).lower():
                                    normalized.add(str(opt.get('id', '')))
                                    break
                        if normalized == correct_options:
                            sub_data['earned'] += correct_marks
                            sub_data['correct'] += 1
                        else:
                            sub_data['earned'] -= negative_marks

                    elif qtype in ('NUMERICAL', 'INTEGER_TYPE'):
                        try:
                            val = float(ans)
                            ans_from = float(q.answer_from) if getattr(q, 'answer_from', None) is not None else None
                            ans_to = float(q.answer_to) if getattr(q, 'answer_to', None) is not None else None
                            if ans_from is not None and ans_to is not None and ans_from <= val <= ans_to:
                                sub_data['earned'] += correct_marks
                                sub_data['correct'] += 1
                            else:
                                sub_data['earned'] -= negative_marks
                        except Exception:
                            sub_data['earned'] -= negative_marks

    # ── Build SWOT output ─────────────────────────────────────────────────────
    strengths_items = []
    weaknesses_items = []
    recommendations = []

    for name, data in subjects_data.items():
        if data['max'] > 0:
            accuracy = max(0.0, round((data['earned'] / data['max']) * 100, 2))
        else:
            accuracy = 0.0

        avg_time = round(data['time_spent'] / data['q_count'], 1) if data['q_count'] > 0 else 0

        if accuracy >= 70.0:
            strengths_items.append({
                'text': f"High conceptual accuracy in {name} ({accuracy}%)",
                'score': int(accuracy)
            })
        elif accuracy < 60.0:
            weaknesses_items.append({
                'text': f"Struggling with advanced concepts in {name} ({accuracy}%)",
                'score': int(accuracy)
            })

        if avg_time > 90:
            weaknesses_items.append({
                'text': f"Pacing issues in {name} (avg {avg_time}s per question)",
                'score': int(max(0, 100 - (avg_time - 90)))
            })

    if not strengths_items and subjects_data:
        sorted_subs = sorted(subjects_data.items(), key=lambda x: (x[1]['earned'] / x[1]['max'] if x[1]['max'] > 0 else 0), reverse=True)
        top_name, top_data = sorted_subs[0]
        top_acc = max(0.0, round((top_data['earned'] / top_data['max']) * 100, 2)) if top_data['max'] > 0 else 0.0
        strengths_items.append({'text': f"Highest relative accuracy in {top_name} ({top_acc}%)", 'score': int(top_acc)})

    if not weaknesses_items and subjects_data:
        sorted_subs = sorted(subjects_data.items(), key=lambda x: (x[1]['earned'] / x[1]['max'] if x[1]['max'] > 0 else 0))
        bottom_name, bottom_data = sorted_subs[0]
        bottom_acc = max(0.0, round((bottom_data['earned'] / bottom_data['max']) * 100, 2)) if bottom_data['max'] > 0 else 0.0
        weaknesses_items.append({'text': f"Relatively lower accuracy in {bottom_name} ({bottom_acc}%)", 'score': int(bottom_acc)})

    for item in strengths_items[:2]:
        sub_name = item['text'].split(' in ')[-1].split(' (')[0]
        recommendations.append({'text': f"Leverage your strength in {sub_name} by attempting higher difficulty mock questions.", 'color': "indigo", 'icon': "CheckCircle"})
    for item in weaknesses_items[:2]:
        sub_name = item['text'].split(' in ')[-1].split(' (')[0]
        if "Pacing issues" in item['text']:
            recommendations.append({'text': f"Take timed revision quizzes for {sub_name} to lower question response time.", 'color': "orange", 'icon': "Clock"})
        else:
            recommendations.append({'text': f"Focus on core concepts in {sub_name} and resolve doubts with teachers.", 'color': "orange", 'icon': "Clock"})

    if not recommendations:
        recommendations.append({'text': "Continue taking regular mock exams to gather more performance data.", 'color': "blue", 'icon': "CheckCircle"})

    # Opportunities
    opps = []
    try:
        from tests.models import TestCentreAllotment
        from centres.models import Centre
        centre = None
        if user.centre_code:
            centre = Centre.objects.filter(code=user.centre_code).first()
        allotment_qs = TestCentreAllotment.objects.filter(is_active=True)
        if centre:
            allotment_qs = allotment_qs.filter(centre=centre)
        for allotment in allotment_qs.filter(start_time__gt=now).order_by('start_time')[:2]:
            opps.append({'text': f"Upcoming Mock Test: {allotment.test.name}", 'tag': "Exam"})
    except Exception:
        pass

    if len(opps) < 1:
        opps.append({'text': "Access topic-wise formula sheets on the study materials tab.", 'tag': "Revision"})
    if len(opps) < 2:
        opps.append({'text': "Submit lingering doubts to the Doubts portal.", 'tag': "Doubts"})

    # Threats
    threats = []
    for name, data in subjects_data.items():
        if data['max'] > 0 and (data['earned'] / data['max']) * 100 < 50.0:
            threats.append({'text': f"Risk of low score in entrance exams due to weak {name} accuracy.", 'level': "High"})

    if not threats:
        threats.append({'text': "Increasing speed/difficulty in upcoming phase tests.", 'level': "Medium"})
    if len(threats) < 2:
        threats.append({'text': "Potential backlog build-up if assignments are missed.", 'level': "Low"})

    result = {
        'strengths': {'title': "Strengths", 'subtitle': "Internal positive factors", 'icon': "Shield", 'color': "indigo", 'items': strengths_items},
        'weaknesses': {'title': "Weaknesses", 'subtitle': "Internal areas for improvement", 'icon': "AlertTriangle", 'color': "red", 'items': weaknesses_items},
        'opportunities': {'title': "Opportunities", 'subtitle': "External factors for growth", 'icon': "Lightbulb", 'color': "blue", 'items': opps},
        'threats': {'title': "Threats", 'subtitle': "External challenges to mitigate", 'icon': "Zap", 'color': "orange", 'items': threats[:3]},
        'recommendations': recommendations
    }

    # Cache for 5 minutes
    cache.set(cache_key, result, 300)
    return result


def _empty_swot(now, user):
    return {
        'strengths': {'title': "Strengths", 'subtitle': "Internal positive factors", 'icon': "Shield", 'color': "indigo",
            'items': [{'text': "Awaiting performance data to identify strengths.", 'score': 100}]},
        'weaknesses': {'title': "Weaknesses", 'subtitle': "Internal areas for improvement", 'icon': "AlertTriangle", 'color': "red",
            'items': [{'text': "Awaiting performance data to identify weaknesses.", 'score': 100}]},
        'opportunities': {'title': "Opportunities", 'subtitle': "External factors for growth", 'icon': "Lightbulb", 'color': "blue",
            'items': [{'text': "Complete your first online mock exam.", 'tag': "NEET Practice"}, {'text': "Review syllabus guidelines.", 'tag': "Syllabus"}]},
        'threats': {'title': "Threats", 'subtitle': "External challenges to mitigate", 'icon': "Zap", 'color': "orange",
            'items': [{'text': "Keep up consistent attendance to avoid study gaps.", 'level': "Medium"}]},
        'recommendations': [{'text': "Start by taking practice tests to kickstart your personalized AI SWOT analysis.", 'color': "blue", 'icon': "CheckCircle"}]
    }
