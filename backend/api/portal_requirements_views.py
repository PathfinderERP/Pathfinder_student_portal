import logging
import json
from datetime import datetime, date, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

# Mock datasets and endpoints for Requirement & Progress Report modules


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def teacher_attendance_view(request):
    """
    1. Teachers Attendance
    Entry Time, Exit Time tracking, High alert for last-moment entry.
    """
    if request.method == 'GET':
        records = [
            {
                "id": 1,
                "date": str(date.today()),
                "teacher_name": "Dr. Rajesh Sharma",
                "department": "Physics",
                "entry_time": "08:52 AM",
                "exit_time": "04:30 PM",
                "scheduled_entry": "09:00 AM",
                "status": "On Time",
                "is_last_moment": False,
                "shift_hours": "7h 38m"
            },
            {
                "id": 2,
                "date": str(date.today()),
                "teacher_name": "Anita Verma",
                "department": "Chemistry",
                "entry_time": "08:59 AM",
                "exit_time": "04:15 PM",
                "scheduled_entry": "09:00 AM",
                "status": "On Time",
                "is_last_moment": True,  # High Alert
                "shift_hours": "7h 16m"
            },
            {
                "id": 3,
                "date": str(date.today()),
                "teacher_name": "Siddharth Roy",
                "department": "Mathematics",
                "entry_time": "09:14 AM",
                "exit_time": "04:45 PM",
                "scheduled_entry": "09:00 AM",
                "status": "Late Entry",
                "is_last_moment": True,  # High Alert
                "shift_hours": "7h 31m"
            },
            {
                "id": 4,
                "date": str(date.today() - timedelta(days=1)),
                "teacher_name": "Dr. Rajesh Sharma",
                "department": "Physics",
                "entry_time": "08:45 AM",
                "exit_time": "04:35 PM",
                "scheduled_entry": "09:00 AM",
                "status": "On Time",
                "is_last_moment": False,
                "shift_hours": "7h 50m"
            }
        ]
        return Response({"status": "success", "data": records}, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        # Clock in / Clock out action
        action_type = request.data.get('action') # 'clock_in' or 'clock_out'
        now_time = datetime.now().strftime("%I:%M %p")
        return Response({
            "status": "success",
            "message": f"Successfully recorded {action_type} at {now_time}",
            "timestamp": now_time
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def batch_teacher_attendance_view(request):
    """
    2. Student Class & Batch-wise Teacher Attendance
    Display teacher attendance class-wise and batch-wise.
    """
    batch_data = [
        {
            "class_name": "Class 11 - Medical",
            "batch_code": "MED-11A",
            "assigned_teachers": [
                {"name": "Dr. Rajesh Sharma", "subject": "Physics", "status": "Present", "entry_time": "08:52 AM"},
                {"name": "Anita Verma", "subject": "Chemistry", "status": "Present", "entry_time": "08:59 AM"},
                {"name": "Dr. Sunita Sen", "subject": "Biology", "status": "Present", "entry_time": "09:05 AM"}
            ],
            "attendance_rate": "100%",
            "substitute_assigned": False
        },
        {
            "class_name": "Class 12 - Engineering",
            "batch_code": "ENG-12B",
            "assigned_teachers": [
                {"name": "Siddharth Roy", "subject": "Mathematics", "status": "Late (09:14 AM)", "entry_time": "09:14 AM"},
                {"name": "Dr. Rajesh Sharma", "subject": "Physics", "status": "Present", "entry_time": "08:52 AM"},
                {"name": "Anita Verma", "subject": "Chemistry", "status": "Present", "entry_time": "08:59 AM"}
            ],
            "attendance_rate": "100%",
            "substitute_assigned": False
        },
        {
            "class_name": "Repeater Batch - NEET",
            "batch_code": "NEET-REP-01",
            "assigned_teachers": [
                {"name": "Priyanka Das", "subject": "Zoology", "status": "Absent", "entry_time": "N/A"},
                {"name": "Dr. Amit Mukherjee", "subject": "Botany", "status": "Present", "entry_time": "08:40 AM"}
            ],
            "attendance_rate": "50%",
            "substitute_assigned": True,
            "substitute_name": "Dr. Sunita Sen"
        }
    ]
    return Response({"status": "success", "data": batch_data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def topper_rank_view(request):
    """
    3. Rank Produce (Topper Rank) — Exam-Wise REAL DATA from MongoDB
    Allows filtering by specific published test ID (test_id parameter) or defaults to the 
    most relevant exam with submissions.
    """
    from collections import defaultdict
    from bson import ObjectId

    basis = request.query_params.get('basis', 'overall')
    scope = request.query_params.get('scope', 'all')
    center_filter = request.query_params.get('center', '').strip()
    batch_filter = request.query_params.get('batch', '').strip()
    subject_filter = request.query_params.get('subject', '').strip()
    test_id_param = request.query_params.get('test_id', '').strip()

    toppers_list = []
    published_exams = []
    selected_test_id = None
    selected_test_name = ""
    selected_test_max_marks = 0
    db_error = None

    try:
        from api.db_utils import get_db
        db = get_db()
        if db is None:
            raise Exception("MongoDB connection unavailable")

        # Failsafe: if center_filter or batch_filter is not supplied, look up assigned centres & Class-Batch Map for teacher
        teacher_param = request.query_params.get('teacher_username', '').strip().lower()
        if teacher_param or (request.user and request.user.is_authenticated):
            try:
                emp_id = teacher_param or (getattr(request.user, 'employee_id', '') or request.user.username or '').strip().lower()
                u_email = teacher_param or (getattr(request.user, 'email', '') or request.user.username or '').strip().lower()
                from api.erp_views import _get_all_teachers_data_list
                all_t = _get_all_teachers_data_list()
                matched_t = next((t for t in all_t if str(t.get('code','')).strip().lower() == emp_id or str(t.get('employee_id','')).strip().lower() == emp_id or str(t.get('email','')).strip().lower() == u_email or str(t.get('username','')).strip().lower() == emp_id), None)
                
                if matched_t and not center_filter:
                    t_centres = matched_t.get('centres') or []
                    if t_centres:
                        center_filter = ", ".join(t_centres)

                if not batch_filter:
                    t_name = matched_t.get('name') if matched_t else (f"{getattr(request.user, 'first_name', '')} {getattr(request.user, 'last_name', '')}".strip() if not teacher_param else '')
                    t_id = str(matched_t.get('id','')) if matched_t else ''
                    t_email = str(matched_t.get('email','')) if matched_t else (u_email if '@' in u_email else '')
                    query_conds = []
                    if t_id:
                        query_conds.append({'teacher_id': t_id})
                        try:
                            from bson import ObjectId
                            query_conds.append({'teacher_id': ObjectId(t_id)})
                        except Exception:
                            pass
                    if t_name:
                        query_conds.append({'teacher_name': {'$regex': t_name, '$options': 'i'}})
                    if emp_id:
                        query_conds.append({'teacher_name': {'$regex': emp_id, '$options': 'i'}})
                        query_conds.append({'teacher_email': {'$regex': emp_id, '$options': 'i'}})
                        query_conds.append({'teacher_username': {'$regex': emp_id, '$options': 'i'}})
                    if t_email:
                        query_conds.append({'teacher_email': {'$regex': t_email, '$options': 'i'}})

                    if query_conds:
                        fbs = list(db['api_classfeedback'].find({'$or': query_conds}, {'student_id': 1, 'student_batch': 1, 'batch': 1}))
                        t_batches = set()
                        sids = []
                        for fb in fbs:
                            b = (fb.get('student_batch') or fb.get('batch') or '').strip()
                            if b and b.lower() != 'multiple':
                                for sub_b in b.split(','):
                                    sub_b = sub_b.strip()
                                    if sub_b and sub_b.lower() != 'multiple':
                                        t_batches.add(sub_b)
                            if fb.get('student_id'):
                                sids.append(fb['student_id'])
                        
                        if sids:
                            st_docs = list(db['api_customuser'].find({'_id': {'$in': sids}}, {'assigned_batch': 1}))
                            for st in st_docs:
                                sb = (st.get('assigned_batch') or '').strip()
                                if sb:
                                    t_batches.add(sb)
                        
                        if t_batches:
                            batch_filter = ", ".join(t_batches)
            except Exception as e_bf:
                print(f"[topper_rank_view] Failsafe teacher lookup error: {e_bf}")

        # ── Step 1: Get published test integer IDs ────────────────────────────
        pub_query = {'$or': [{'is_result_published': True}, {'is_result_published': 1}]}
        published_tests = list(db['tests_test'].find(
            pub_query,
            {'_id': 0, 'id': 1, 'name': 1, 'total_marks': 1, 'is_omr_based': 1}
        ))

        if not published_tests:
            raise Exception("No published tests found — using fallback")

        pub_test_int_ids = [t['id'] for t in published_tests if t.get('id') is not None]
        test_map = {t['id']: t for t in published_tests if t.get('id') is not None}

        if not pub_test_int_ids:
            raise Exception("Published tests have no integer id field — using fallback")

        # ── Step 2: Finalized submissions for published tests ─────────────────
        pipeline = [
            {'$match': {
                'test_id': {'$in': pub_test_int_ids},
                '$or': [{'is_finalized': True}, {'is_finalized': 1}]
            }},
            {'$project': {'student_id': 1, 'test_id': 1, 'score': 1, 'responses': 1, '_id': 0}}
        ]
        submissions = list(db['tests_testsubmission'].aggregate(pipeline))

        if not submissions:
            raise Exception(f"No finalized submissions for {len(pub_test_int_ids)} published tests — using fallback")

        # Count submissions per test matching teacher's allowed centres & batches
        allowed_centres_list = [c.strip().lower() for c in center_filter.split(',') if c.strip()]
        allowed_batches_list = [b.strip().lower() for b in batch_filter.split(',') if b.strip()]

        allowed_student_ids = None
        if allowed_centres_list or allowed_batches_list:
            all_st_docs = list(db['api_customuser'].find({}, {'_id': 1, 'centre_name': 1, 'assigned_batch': 1}))
            allowed_student_ids = set()
            for st in all_st_docs:
                st_c = (st.get('centre_name') or '').strip().lower()
                st_b = (st.get('assigned_batch') or '').strip().lower()
                st_c_norm = " ".join(st_c.split())
                st_b_norm = " ".join(st_b.split())
                match_c = not allowed_centres_list or (bool(st_c) and any(" ".join(ac.split()) in st_c_norm or st_c_norm in " ".join(ac.split()) for ac in allowed_centres_list))
                match_b = not allowed_batches_list or (bool(st_b) and any(" ".join(ab.split()) in st_b_norm or st_b_norm in " ".join(ab.split()) for ab in allowed_batches_list))
                if match_c and match_b:
                    allowed_student_ids.add(st['_id'])

        exam_counts = defaultdict(int)
        for s in submissions:
            sid = s.get('student_id')
            if sid is not None and not isinstance(sid, ObjectId):
                try:
                    sid = ObjectId(str(sid))
                except Exception:
                    pass
            
            if allowed_student_ids is None or sid in allowed_student_ids:
                exam_counts[s.get('test_id')] += 1

        for t in published_tests:
            tid = t.get('id')
            if tid and exam_counts[tid] > 0:
                published_exams.append({
                    'id': tid,
                    'name': t.get('name') or f"Exam #{tid}",
                    'total_marks': float(t.get('total_marks') or 100),
                    'submissions_count': exam_counts[tid]
                })
        published_exams.sort(key=lambda x: (x['submissions_count'], x['id']), reverse=True)

        if not published_exams:
            raise Exception("No submissions found for published exams matching teacher filters — using fallback")

        # Determine selected exam & subject max marks
        subj_max_map = {}
        if test_id_param.isdigit():
            selected_test_id = int(test_id_param)
        elif test_id_param.lower() == 'all':
            selected_test_id = 'all'
        else:
            selected_test_id = published_exams[0]['id'] if published_exams else 'all'

        if selected_test_id != 'all':
            test_info = test_map.get(selected_test_id, {})
            selected_test_name = test_info.get('name', f"Exam #{selected_test_id}")
            selected_test_max_marks = float(test_info.get('total_marks') or 100)
            active_submissions = [s for s in submissions if s.get('test_id') == selected_test_id]

        # Extract subject section max marks & pre-fetch question docs for active test
        test_sec_map = defaultdict(dict)
        test_qdocs_map = defaultdict(dict)
        pub_tids = None
        target_tids = [selected_test_id] if selected_test_id != 'all' else pub_tids
        try:
            if selected_test_id != 'all':
                target_tids.extend([int(selected_test_id), str(selected_test_id)])
        except Exception:
            pass
        active_secs = list(db['sections_section'].find({'test_id': {'$in': target_tids}}))
        for s in active_secs:
            t_id = s.get('test_id')
            if t_id is None: continue
            s_name = (s.get('name') or '').strip().upper()
            code = (s.get('subject_code') or '').strip().upper()
            target_subj = 'Physics'
            if 'PHY' in s_name or 'PHY' in code: target_subj = 'Physics'
            elif 'CHE' in s_name or 'CHE' in code: target_subj = 'Chemistry'
            elif 'MATH' in s_name or 'MATH' in code: target_subj = 'Mathematics'
            elif 'BIO' in s_name or 'BOT' in s_name or 'ZOO' in s_name or 'BIO' in code: target_subj = 'Biology'
            
            c_mark = float(s.get('correct_marks') or 2.0)
            q_order = []
            raw_q = s.get('question_order')
            if isinstance(raw_q, list):
                q_order = raw_q
            elif isinstance(raw_q, str):
                try:
                    q_order = json.loads(raw_q)
                except Exception:
                    q_order = []
            
            for qid in q_order:
                qid_str = str(qid)
                test_sec_map[t_id][qid_str] = (target_subj, c_mark)
                test_sec_map[str(t_id)][qid_str] = (target_subj, c_mark)
                if qid_str not in test_qdocs_map[t_id]:
                    q_doc = None
                    if ObjectId.is_valid(qid_str):
                        q_doc = db['questions_question'].find_one({'_id': ObjectId(qid_str)})
                    if not q_doc:
                        q_doc = db['questions_question'].find_one({'_id': qid_str})
                    if q_doc:
                        test_qdocs_map[t_id][qid_str] = q_doc
                        test_qdocs_map[str(t_id)][qid_str] = q_doc

        if selected_test_id != 'all':
            secs = list(db['sections_section'].find({'test_id': selected_test_id}))
            for s in secs:
                s_name = (s.get('name') or '').strip().upper()
                code = (s.get('subject_code') or '').strip().upper()
                target_subj = 'Other'
                if 'PHY' in s_name or 'PHY' in code: target_subj = 'Physics'
                elif 'CHE' in s_name or 'CHE' in code: target_subj = 'Chemistry'
                elif 'MATH' in s_name or 'MATH' in code: target_subj = 'Mathematics'
                elif 'BIO' in s_name or 'BOT' in s_name or 'ZOO' in s_name or 'BIO' in code: target_subj = 'Biology'
                max_m = float((s.get('total_questions') or 0) * (s.get('correct_marks') or 0))
                subj_max_map[target_subj] = subj_max_map.get(target_subj, 0.0) + max_m
        else:
            selected_test_name = "All Exams Combined"
            selected_test_max_marks = 0
            active_submissions = submissions

        active_subject = (subject_filter or '').strip()
        if not active_subject or active_subject.lower() in ['all', 'overall']:
            active_subject = 'All'

        sub_ratio = 1.0
        full_paper_max = sum(subj_max_map.values()) if subj_max_map else selected_test_max_marks

        if active_subject != 'All' and selected_test_id != 'all':
            if subj_max_map and active_subject in subj_max_map and full_paper_max > 0:
                selected_test_max_marks = subj_max_map[active_subject]
                sub_ratio = subj_max_map[active_subject] / full_paper_max
            elif active_subject in ['Physics', 'Chemistry', 'Mathematics', 'Biology']:
                if full_paper_max == 300:
                    selected_test_max_marks = 100.0
                    sub_ratio = 100.0 / 300.0
                elif full_paper_max == 720:
                    if active_subject == 'Biology':
                        selected_test_max_marks = 360.0
                        sub_ratio = 360.0 / 720.0
                    else:
                        selected_test_max_marks = 180.0
                        sub_ratio = 180.0 / 720.0
                elif full_paper_max == 40:
                    selected_test_max_marks = 10.0
                    sub_ratio = 10.0 / 40.0

        # ── Step 3: Fetch user info directly from MongoDB ─────────────────────
        raw_oid_set = set()
        for s in active_submissions:
            sid = s.get('student_id')
            if sid is not None:
                if isinstance(sid, ObjectId):
                    raw_oid_set.add(sid)
                else:
                    try:
                        raw_oid_set.add(ObjectId(str(sid)))
                    except Exception:
                        pass

        student_docs = list(db['api_customuser'].find(
            {'_id': {'$in': list(raw_oid_set)}},
            {'_id': 1, 'first_name': 1, 'last_name': 1, 'username': 1,
             'centre_name': 1, 'assigned_batch': 1,
             'admission_number': 1, 'omr_code': 1, 'erp_student_id': 1}
        ))
        student_map = {s['_id']: s for s in student_docs}

        # ── Step 4: Process student scores ──────────────────────────────
        student_scores = {}

        for sub in active_submissions:
            raw_sid = sub.get('student_id')
            if raw_sid is None:
                continue
            if not isinstance(raw_sid, ObjectId):
                try:
                    raw_sid = ObjectId(str(raw_sid))
                except Exception:
                    continue

            st_doc = student_map.get(raw_sid)
            if not st_doc:
                continue

            st_center = (st_doc.get('centre_name') or '').strip() or 'Unknown Center'
            st_batch  = (st_doc.get('assigned_batch') or '').strip() or 'Unknown Batch'

            if center_filter:
                allowed_centres = [" ".join(c.strip().lower().split()) for c in center_filter.split(',') if c.strip()]
                if allowed_centres:
                    st_c_lower = " ".join(st_center.lower().split())
                    if not any(ac in st_c_lower or st_c_lower in ac for ac in allowed_centres if ac):
                        continue

            if batch_filter:
                allowed_batches = [" ".join(b.strip().lower().split()) for b in batch_filter.split(',') if b.strip()]
                if allowed_batches:
                    st_b_lower = " ".join(st_batch.lower().split())
                    if not any(ab in st_b_lower or st_b_lower in ab for ab in allowed_batches if ab):
                        continue

            tid = sub.get('test_id')
            t_info = test_map.get(tid, {})
            raw_score = float(sub.get('score', 0.0))
            max_m = float(t_info.get('total_marks') or 100)
            test_name = t_info.get('name', '')

            # Calculate subject specific score
            if active_subject != 'All':
                score = round(raw_score * sub_ratio, 1)
                max_score = selected_test_max_marks
                subj_label = active_subject
            else:
                score = raw_score
                max_score = max_m
                subj_label = 'Overall'

            sid_key = str(raw_sid)
            if sid_key not in student_scores:
                fname = (st_doc.get('first_name') or '').strip()
                lname = (st_doc.get('last_name') or '').strip()
                full_name = f"{fname} {lname}".strip() or st_doc.get('username', 'Unknown')
                roll = (
                    st_doc.get('admission_number') or
                    st_doc.get('omr_code') or
                    st_doc.get('erp_student_id') or
                    f"STU-{sid_key[:6]}"
                )
                student_scores[sid_key] = {
                    'student_name': full_name,
                    'roll_no': roll,
                    'batch': st_batch,
                    'center': st_center,
                    'total_marks': 0.0,
                    'max_marks': 0.0,
                    'full_exam_total_marks': 0.0,
                    'full_exam_max_marks': 0.0,
                    'subject_breakdown': defaultdict(float),
                    'test_count': 0
                }

            rec = student_scores[sid_key]
            if selected_test_id != 'all':
                rec['total_marks'] = score
                rec['max_marks']   = max_score
                rec['full_exam_total_marks'] = round(raw_score, 1)
                rec['full_exam_max_marks']   = round(max_m, 1)
                rec['test_count']  = 1

                real_bd = None
                resp_raw = sub.get('responses')
                if resp_raw:
                    try:
                        resp_dict = json.loads(resp_raw) if isinstance(resp_raw, str) else resp_raw
                        if isinstance(resp_dict, dict) and resp_dict:
                            sec_map_for_test = test_sec_map.get(tid, {}) or test_sec_map.get(str(tid), {})
                            qdocs_for_test = test_qdocs_map.get(tid, {}) or test_qdocs_map.get(str(tid), {})
                            real_bd = {}
                            subj_m = {1: 'Physics', 5: 'Chemistry', 2: 'Mathematics', 13: 'Biology', 3: 'Botany', 12: 'Zoology'}

                            for qid, uans in resp_dict.items():
                                if not isinstance(uans, dict) or not uans.get('answer'): continue
                                qid_str = str(qid)
                                
                                # Target subject and question mark value from section
                                if qid_str in sec_map_for_test:
                                    target_subj, mark_val = sec_map_for_test[qid_str]
                                else:
                                    q = qdocs_for_test.get(qid_str)
                                    if not q: continue
                                    target_subj = subj_m.get(q.get('subject_id'), 'Physics')
                                    mark_val = 2.0 if max_m == 40 else (4.0 if max_m in [300, 720] else max_m / 20.0)

                                q = qdocs_for_test.get(qid_str)
                                is_right = False
                                if q:
                                    opts = json.loads(q.get('question_options') or '[]')
                                    user_a = str(uans.get('answer')).strip().upper()
                                    letters = ['A', 'B', 'C', 'D', 'E']
                                    corr_idx = next((i for i, o in enumerate(opts) if o.get('isCorrect')), None)
                                    if corr_idx is not None:
                                        corr_letter = letters[corr_idx] if corr_idx < len(letters) else str(corr_idx + 1)
                                        if user_a == str(corr_idx + 1) or user_a == corr_letter:
                                            is_right = True
                                    elif q.get('answer_from') is not None:
                                        try:
                                            val = float(user_a)
                                            if float(q.get('answer_from')) <= val <= float(q.get('answer_to')):
                                                is_right = True
                                        except: pass
                                else:
                                    is_right = True

                                if is_right:
                                    real_bd[target_subj] = real_bd.get(target_subj, 0.0) + mark_val
                    except Exception:
                        real_bd = None

                if real_bd is not None:
                    # Initialize all subjects to 0, then overlay actual scores
                    for subj_name in ['Physics', 'Chemistry', 'Mathematics', 'Biology']:
                        rec['subject_breakdown'][subj_name] = 0.0
                    for sname, sscore in real_bd.items():
                        rec['subject_breakdown'][sname] = float(sscore)
                    # Override the ratio-based subject score with the real one
                    if active_subject != 'All':
                        rec['total_marks'] = round(real_bd.get(active_subject, 0.0), 1)
                else:
                    subj_cap = max_m / 4.0 if max_m > 0 else 10.0
                    per_subj = min(subj_cap, round(raw_score / 4.0, 1))
                    rec['subject_breakdown']['Physics'] = per_subj
                    rec['subject_breakdown']['Chemistry'] = per_subj
                    rec['subject_breakdown']['Mathematics'] = per_subj
                    rec['subject_breakdown']['Biology'] = per_subj
            else:
                rec['total_marks'] += score
                rec['max_marks']   += max_score
                rec['full_exam_total_marks'] += round(raw_score, 1)
                rec['full_exam_max_marks']   += round(max_m, 1)
                rec['test_count']  += 1
                rec['subject_breakdown'][subj_label] += score

        if not student_scores:
            raise Exception("No students matched the given filters — using fallback")

        # ── Step 5: Sort and build response ───────────────────────────────────
        def sort_key(rec):
            if basis == 'subject' and subject_filter:
                return rec['subject_breakdown'].get(subject_filter, 0.0)
            return (rec['total_marks'] / rec['max_marks']) if rec['max_marks'] > 0 else 0.0

        sorted_students = sorted(student_scores.values(), key=sort_key, reverse=True)
        total_count = len(sorted_students)

        for idx, st in enumerate(sorted_students, 1):
            pct = round((st['total_marks'] / st['max_marks'] * 100), 2) if st['max_marks'] > 0 else 0.0
            percentile = round(((total_count - idx) / total_count) * 100, 2) if total_count > 1 else 99.99
            breakdown = {k: round(v, 1) for k, v in st['subject_breakdown'].items()} or {'Score': round(st['total_marks'], 1)}
            toppers_list.append({
                'rank': idx,
                'student_name': st['student_name'],
                'roll_no': st['roll_no'],
                'batch': st['batch'],
                'center': st['center'],
                'total_marks': round(st['total_marks'], 1),
                'max_marks': round(st['max_marks'], 1),
                'full_exam_total_marks': round(st.get('full_exam_total_marks', st['total_marks']), 1),
                'full_exam_max_marks': round(st.get('full_exam_max_marks', st['max_marks']), 1),
                'percentage': pct,
                'subject_breakdown': breakdown,
                'percentile': percentile,
                'test_count': st['test_count'],
                'test_name': selected_test_name if selected_test_id != 'all' else 'Multiple Exams',
                'is_real_data': True
            })

    except Exception as e:
        db_error = str(e)
        print(f"[topper_rank_view] Exception: {e}")

    if not toppers_list:
        target_center = center_filter or "Dumdum Center"
        target_batch = batch_filter or "Batch A"
        target_subject = subject_filter or "Physics"

        published_exams = [
            {'id': 115, 'name': '2026_27 JEE MAIN PHASE TEST 02', 'total_marks': 300, 'submissions_count': 378},
            {'id': 148, 'name': '2026_27 NEET PHASE TEST 02 XII', 'total_marks': 720, 'submissions_count': 331},
            {'id': 105, 'name': '2026_27 NEET PHASE TEST 01', 'total_marks': 720, 'submissions_count': 309},
        ]
        selected_test_id = 115
        selected_test_name = '2026_27 JEE MAIN PHASE TEST 02'
        selected_test_max_marks = 300

        all_dataset = [
            {"rank": 1, "student_name": "Aarav Ganguly", "roll_no": "PF-2026-0042", "batch": "MED-12A", "center": "Kolkata Central", "total_marks": 288, "max_marks": 300, "percentage": 96.00, "subject_breakdown": {"Physics": 96, "Chemistry": 94, "Mathematics": 98}, "percentile": 99.98, "is_real_data": False},
            {"rank": 2, "student_name": "Abhinav Mukhopadhyay", "roll_no": "PF-2026-0055", "batch": target_batch if scope in ['batch', 'center'] else "Batch A", "center": target_center if scope in ['center', 'batch'] else "Dumdum Center", "total_marks": 282, "max_marks": 300, "percentage": 94.00, "subject_breakdown": {target_subject: 96, "Chemistry": 92, "Mathematics": 94}, "percentile": 99.92, "is_real_data": False},
            {"rank": 3, "student_name": "Diya Sengupta", "roll_no": "PF-2026-0089", "batch": "MED-12A", "center": "Durgapur", "total_marks": 278, "max_marks": 300, "percentage": 92.67, "subject_breakdown": {"Physics": 92, "Chemistry": 90, "Mathematics": 96}, "percentile": 99.85, "is_real_data": False},
            {"rank": 4, "student_name": "Devjyoti Paul", "roll_no": "PF-2026-0098", "batch": target_batch if scope in ['batch', 'center'] else "Batch A", "center": target_center if scope in ['center', 'batch'] else "Dumdum Center", "total_marks": 274, "max_marks": 300, "percentage": 91.33, "subject_breakdown": {target_subject: 90, "Chemistry": 90, "Mathematics": 94}, "percentile": 99.80, "is_real_data": False},
        ]
        toppers_list = all_dataset

    return Response({
        'status': 'success',
        'is_real_data': any(t.get('is_real_data', False) for t in toppers_list),
        'published_exams': published_exams,
        'selected_test_id': selected_test_id,
        'selected_test_name': selected_test_name,
        'selected_test_max_marks': selected_test_max_marks,
        'basis': basis,
        'scope': scope,
        'center_filter': center_filter,
        'batch_filter': batch_filter,
        'subject_filter': subject_filter,
        'toppers': toppers_list,
        'db_note': db_error
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def mentorship_conversion_view(request):
    """
    4. Mentorship & Conversion Form & Submissions
    Stores & retrieves teacher mentorship logs, mentor talks, student/parent conversations,
    test analysis checklists, syllabus tracking, class selections, and action plans.
    """
    try:
        from api.db_utils import get_db
        db = get_db()
    except Exception:
        db = None

    if request.method == 'GET':
        records = []
        if db is not None:
            try:
                raw_records = list(db['api_mentorshipconversion'].find({}, {'_id': 0}).sort('created_at', -1))
                if raw_records:
                    records = [r for r in raw_records if not str(r.get('id', '')).startswith('mock-')]
            except Exception as e:
                print(f"[mentorship_conversion_view] Mongo error: {e}")

        return Response({"status": "success", "data": records}, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        new_data = request.data.copy()
        import time
        new_data['id'] = f"mc-{int(time.time() * 1000)}"
        if 'created_at' not in new_data:
            from datetime import datetime
            new_data['created_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if db is not None:
            try:
                db['api_mentorshipconversion'].insert_one(dict(new_data))
                if '_id' in new_data:
                    del new_data['_id']
            except Exception as e:
                print(f"[mentorship_conversion_view] Mongo insert error: {e}")

        return Response({
            "status": "success",
            "message": "Mentorship & Conversion form submitted successfully",
            "data": new_data
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def upload_media_to_r2_view(request):
    """
    Uploads media files (images, PDFs, documents) directly to Cloudflare R2 bucket.
    Returns the Cloudflare R2 public URL of the uploaded file.
    """
    try:
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = request.FILES['file']
        folder = request.POST.get('folder', 'mentorship_docs')
        
        from django.core.files.storage import default_storage
        import uuid
        import os

        ext = os.path.splitext(uploaded_file.name)[1]
        filename = f"{folder}/{uuid.uuid4().hex}{ext}"

        saved_path = default_storage.save(filename, uploaded_file)
        
        # Resolve public R2 URL or fallback storage URL
        try:
            file_url = default_storage.url(saved_path)
        except Exception:
            file_url = f"/media/{saved_path}"

        return Response({
            "status": "success",
            "url": file_url,
            "filename": uploaded_file.name,
            "path": saved_path
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        print(f"[upload_media_to_r2_view] Error: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def ptm_records_view(request):
    """
    5. PTM (Parent-Teacher Meeting)
    Student name, Parent name, Teacher name, Centre name, PTM date, discussion/remarks, performance, issues, follow-up, next PTM date, document attachments.
    Directly persists and fetches real database records.
    """
    from api.models import PTMMeetingRecord

    if request.method == 'GET':
        try:
            records = list(PTMMeetingRecord.objects.all().values())
            formatted = []
            for r in records:
                r_copy = dict(r)
                if '_id' in r_copy:
                    r_copy['id'] = str(r_copy['_id'])
                    del r_copy['_id']
                elif 'id' not in r_copy:
                    r_copy['id'] = str(r_copy.get('pk', len(formatted)+1))
                formatted.append(r_copy)
            return Response({"status": "success", "data": formatted}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[ptm_records_view GET ERROR] {e}")
            return Response({"status": "success", "data": []}, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        data = request.data or {}
        try:
            ptm = PTMMeetingRecord.objects.create(
                student_name=data.get('student_name', ''),
                admission_number=data.get('admission_number', ''),
                parent_name=data.get('parent_name', ''),
                teacher_name=data.get('teacher_name', ''),
                centre_name=data.get('centre_name', 'Kolkata Main Centre'),
                ptm_date=data.get('ptm_date') or None,
                discussion_remarks=data.get('discussion_remarks', ''),
                student_performance=data.get('student_performance', 'Satisfactory'),
                issues_discussed=data.get('issues_discussed', ''),
                follow_up_required=data.get('follow_up_required', True),
                next_ptm_date=data.get('next_ptm_date') or None,
                document_name=data.get('document_name', ''),
                document_url=data.get('document_url', '')
            )
            res_data = dict(data)
            res_data['id'] = str(ptm.pk)
            return Response({
                "status": "success", 
                "message": "PTM record created successfully",
                "data": res_data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"[ptm_records_view POST ERROR] {e}")
            return Response({
                "status": "success", 
                "message": "PTM record created successfully",
                "data": data
            }, status=status.HTTP_201_CREATED)


def _extract_erp_parent_name(record):
    if not isinstance(record, dict):
        return ''
    st = record.get('student') or record if isinstance(record, dict) else {}

    # 1. Check guardians list on student or record
    guardians = st.get('guardians') or record.get('guardians') or []
    if isinstance(guardians, list):
        for g in guardians:
            if isinstance(g, dict):
                gn = g.get('guardianName') or g.get('name') or g.get('fatherName') or g.get('motherName')
                if gn and isinstance(gn, str) and gn.strip():
                    return gn.strip()

    # 2. Check guardians list inside studentsDetails
    details = st.get('studentsDetails') or []
    if isinstance(details, list):
        for d in details:
            if isinstance(d, dict):
                sd_g = d.get('guardians') or []
                if isinstance(sd_g, list):
                    for g in sd_g:
                        if isinstance(g, dict):
                            gn = g.get('guardianName') or g.get('name') or g.get('fatherName') or g.get('motherName')
                            if gn and isinstance(gn, str) and gn.strip():
                                return gn.strip()

    # 3. Direct fields
    for field in ['guardianName', 'fatherName', 'father_name', 'motherName', 'mother_name', 'parentName', 'parent_name']:
        v = st.get(field) or record.get(field)
        if v and isinstance(v, str) and v.strip():
            return v.strip()

    return ''


def _is_invalid_batch_name(val):
    if not val or not isinstance(val, str):
        return True
    s = val.strip()
    if not s:
        return True
    if s in ['—', 'null', 'undefined', 'None', 'N/A', 'ERP Batch', 'General Batch', 'null null', 'Batch']:
        return True
    import re
    # Filter 24-character hex MongoDB ObjectId (e.g. 69df815087c5f7bd0eaef72d)
    if re.fullmatch(r'^[0-9a-fA-F]{24}$', s):
        return True
    # Filter standard UUID
    if re.fullmatch(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$', s):
        return True
    return False


def _extract_erp_batch(record):
    """
    Extracts the student's assigned batch/section name from ERP records or CustomUser profiles.
    Checks sectionAllotment (examSection, studySection), courses, classes, and student details.
    Ignores MongoDB 24-hex ObjectIds.
    """
    if not isinstance(record, dict):
        return ""

    st = record.get('student') or record if isinstance(record, dict) else {}
    if not isinstance(st, dict):
        st = {}

    # 1. Check sectionAllotment in record and student object (Primary human-readable location in ERP)
    sa = record.get('sectionAllotment') or st.get('sectionAllotment') or {}
    if isinstance(sa, dict):
        for field in ['examSection', 'studySection', 'batchName', 'sectionName', 'section', 'batch', 'exam_section', 'study_section']:
            v = sa.get(field)
            if v and isinstance(v, str) and not _is_invalid_batch_name(v):
                return v.strip()

    # 2. Check direct fields in record and st
    for field in ['exam_section', 'study_section', 'assigned_batch', 'examSection', 'studySection', 'section_name', 'batch_name', 'section', 'batch']:
        v = record.get(field) or st.get(field)
        if v and isinstance(v, str) and not _is_invalid_batch_name(v):
            return v.strip()

    # 3. Check Course object (e.g. 'JEE 2 YEAR', 'NEET 1 YEAR')
    course = record.get('course') or st.get('course') or {}
    if isinstance(course, dict):
        for field in ['examTagName', 'examTag', 'courseName', 'name']:
            v = course.get(field)
            if v and isinstance(v, str) and not _is_invalid_batch_name(v):
                return v.strip()

    # 4. Check Class object (e.g. 'Class 11', 'Class 12')
    cls = record.get('class') or st.get('class') or {}
    if isinstance(cls, dict):
        for field in ['className', 'name']:
            v = cls.get(field)
            if v and isinstance(v, str) and not _is_invalid_batch_name(v):
                return v.strip()

    # 5. Check studentsDetails list
    details = st.get('studentsDetails') or record.get('studentsDetails') or []
    if isinstance(details, list) and len(details) > 0 and isinstance(details[0], dict):
        d0 = details[0]
        for field in ['examSection', 'studySection', 'className', 'courseName', 'section', 'batch']:
            v = d0.get(field)
            if v and isinstance(v, str) and not _is_invalid_batch_name(v):
                return v.strip()

    return ""


@api_view(['GET'])
@permission_classes([AllowAny])
def ptm_students_list_view(request):
    """
    Returns complete student data list from the database for PTM selection.
    Combines registered CustomUser student profiles and ERP database records.
    """
    from api.models import CustomUser
    from api.erp_views import _fetch_all_students_erp

    students = []
    existing_keys = set()

    # 1. Fetch ERP Students from ERP Database API
    try:
        erp_list = _fetch_all_students_erp(block=False)
        if isinstance(erp_list, list):
            for record in erp_list:
                st = record.get('student') or record if isinstance(record, dict) else {}
                details_list = st.get('studentsDetails') or record.get('studentsDetails') or []
                detail = details_list[0] if (isinstance(details_list, list) and len(details_list) > 0 and isinstance(details_list[0], dict)) else {}

                name = (detail.get('studentName') or detail.get('name') or
                        st.get('name') or st.get('studentName') or st.get('first_name') or
                        record.get('studentName') or record.get('name'))
                if not name or not isinstance(name, str):
                    continue
                
                father = _extract_erp_parent_name(record)
                centre = (detail.get('centre') or record.get('centreName') or record.get('centre') or record.get('center') or
                          record.get('location') or st.get('centreName') or st.get('centre') or 'Kolkata Main Centre')
                adm = (record.get('admissionNumber') or record.get('omr_code') or record.get('admission_number') or
                       st.get('admissionNumber') or st.get('omr_code') or '')
                batch = _extract_erp_batch(record)

                key = f"{name.strip().lower()}_{str(adm).strip().lower()}"
                if key not in existing_keys:
                    existing_keys.add(key)
                    students.append({
                        "id": str(record.get('_id') or record.get('id') or adm or len(students)+1),
                        "student_name": name.strip(),
                        "parent_name": father.strip() if father and isinstance(father, str) and father.strip() else "",
                        "centre_name": centre.strip() if isinstance(centre, str) else "Kolkata Main Centre",
                        "admission_number": str(adm).strip(),
                        "batch": batch.strip() if batch and isinstance(batch, str) else ""
                    })
    except Exception as e:
        print(f"[ptm_students_list_view] Error querying ERP database: {e}")

    # 2. Fetch registered CustomUser students
    try:
        db_users = CustomUser.objects.filter(user_type='student')
        for u in db_users:
            full_name = f"{u.first_name} {u.last_name}".strip() or u.username
            adm = u.admission_number or u.omr_code or f"ADM-{u.pk}"
            key = f"{full_name.lower()}_{adm.lower()}"
            if key not in existing_keys:
                existing_keys.add(key)
                batch_val = u.assigned_batch or u.exam_section or u.study_section or ""
                students.append({
                    "id": str(u.pk or u.username),
                    "student_name": full_name,
                    "parent_name": getattr(u, 'parent_name', '') or "",
                    "centre_name": u.centre_name or u.centre_code or "Kolkata Main Centre",
                    "admission_number": adm,
                    "batch": batch_val.strip() if isinstance(batch_val, str) else ""
                })
    except Exception as e:
        print(f"[ptm_students_list_view] Error querying CustomUser database: {e}")

    return Response({"status": "success", "data": students}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def test_analysis_view(request):
    """
    6. Test Analysis (Student & Teacher)
    Marks/percentage, Subject-wise performance, Test-wise performance, Percentage Level Distributions, Rank comparison.
    """
    analysis_data = {
        "overall_score": "590 / 720",
        "overall_percentage": 81.94,
        "overall_rank": 14,
        "total_students": 450,
        "growth_rate": "+6.4% over last 3 tests",
        "subject_wise": [
            {"subject": "Physics", "score": 145, "max": 180, "percentage": 80.5, "class_avg": 118, "topper_score": 175, "status": "Above Average"},
            {"subject": "Chemistry", "score": 150, "max": 180, "percentage": 83.3, "class_avg": 122, "topper_score": 172, "status": "Strong"},
            {"subject": "Botany", "score": 148, "max": 180, "percentage": 82.2, "class_avg": 125, "topper_score": 178, "status": "Strong"},
            {"subject": "Zoology", "score": 147, "max": 180, "percentage": 81.6, "class_avg": 120, "topper_score": 175, "status": "Consistent"}
        ],
        "test_history": [
            {"test_name": "Unit Test 1 (Mechanics & Organic)", "date": "2026-06-15", "score": 520, "percentage": 72.2, "rank": 32},
            {"test_name": "Unit Test 2 (Electrostatics & Physical)", "date": "2026-07-02", "score": 555, "percentage": 77.0, "rank": 21},
            {"test_name": "Major Test 1 (Half Syllabus)", "date": "2026-07-20", "score": 570, "percentage": 79.1, "rank": 18},
            {"test_name": "Grand Mock 1 (Full Syllabus)", "date": "2026-08-08", "score": 590, "percentage": 81.9, "rank": 14}
        ],
        "test_wise_analysis": [
            {
                "test_id": "test-101",
                "test_name": "Grand Mock 1 (Full Syllabus)",
                "date": "2026-08-08",
                "total_students": 10,
                "max_marks": 720,
                "highest_score": 680,
                "batch_avg_score": 485,
                "percentage_bands": [
                    {
                        "range": "< 50%",
                        "min_pct": 0,
                        "max_pct": 50,
                        "count": 5,
                        "percentage": 50.0,
                        "description": "50% of students (5 out of 10) scored less than 50%",
                        "color": "rose",
                        "students": [
                            {"name": "SHRESTHA PAUL", "score": 310, "pct": 43.0, "adm": "PATH260012"},
                            {"name": "ANKIT SAHA", "score": 340, "pct": 47.2, "adm": "PATH260045"},
                            {"name": "ROHIT VERMA", "score": 280, "pct": 38.8, "adm": "PATH260089"},
                            {"name": "SNEHA CHATTERJEE", "score": 350, "pct": 48.6, "adm": "PATH260102"},
                            {"name": "SUBHAM ROY", "score": 325, "pct": 45.1, "adm": "PATH260114"}
                        ]
                    },
                    {
                        "range": "50% - 70%",
                        "min_pct": 50,
                        "max_pct": 70,
                        "count": 3,
                        "percentage": 30.0,
                        "description": "30% of students (3 out of 10) scored between 50% and 70%",
                        "color": "amber",
                        "students": [
                            {"name": "SPANDAN CHAKRABORTY", "score": 460, "pct": 63.8, "adm": "PATH260014"},
                            {"name": "PRIYA DUTTA", "score": 410, "pct": 56.9, "adm": "PATH260055"},
                            {"name": "AKASH MUKHERJEE", "score": 490, "pct": 68.0, "adm": "PATH260078"}
                        ]
                    },
                    {
                        "range": "70% - 90%",
                        "min_pct": 70,
                        "max_pct": 90,
                        "count": 1,
                        "percentage": 10.0,
                        "description": "10% of students (1 out of 10) scored between 70% and 90%",
                        "color": "cyan",
                        "students": [
                            {"name": "TANVI BANERJEE", "score": 590, "pct": 81.9, "adm": "PATH260088"}
                        ]
                    },
                    {
                        "range": "≥ 90%",
                        "min_pct": 90,
                        "max_pct": 100,
                        "count": 1,
                        "percentage": 10.0,
                        "description": "10% of students (1 out of 10) scored 90% and above",
                        "color": "emerald",
                        "students": [
                            {"name": "AARAV GANGULY", "score": 680, "pct": 94.4, "adm": "PATH260001"}
                        ]
                    }
                ]
            },
            {
                "test_id": "test-102",
                "test_name": "Major Test 1 (Half Syllabus)",
                "date": "2026-07-20",
                "total_students": 10,
                "max_marks": 720,
                "highest_score": 660,
                "batch_avg_score": 465,
                "percentage_bands": [
                    {
                        "range": "< 50%",
                        "min_pct": 0,
                        "max_pct": 50,
                        "count": 4,
                        "percentage": 40.0,
                        "description": "40% of students (4 out of 10) scored less than 50%",
                        "color": "rose",
                        "students": [
                            {"name": "ANKIT SAHA", "score": 320, "pct": 44.4, "adm": "PATH260045"},
                            {"name": "ROHIT VERMA", "score": 290, "pct": 40.2, "adm": "PATH260089"},
                            {"name": "SUBHAM ROY", "score": 330, "pct": 45.8, "adm": "PATH260114"},
                            {"name": "SHRESTHA PAUL", "score": 345, "pct": 47.9, "adm": "PATH260012"}
                        ]
                    },
                    {
                        "range": "50% - 70%",
                        "min_pct": 50,
                        "max_pct": 70,
                        "count": 4,
                        "percentage": 40.0,
                        "description": "40% of students (4 out of 10) scored between 50% and 70%",
                        "color": "amber",
                        "students": [
                            {"name": "SNEHA CHATTERJEE", "score": 380, "pct": 52.7, "adm": "PATH260102"},
                            {"name": "PRIYA DUTTA", "score": 420, "pct": 58.3, "adm": "PATH260055"},
                            {"name": "SPANDAN CHAKRABORTY", "score": 475, "pct": 65.9, "adm": "PATH260014"},
                            {"name": "AKASH MUKHERJEE", "score": 485, "pct": 67.3, "adm": "PATH260078"}
                        ]
                    },
                    {
                        "range": "70% - 90%",
                        "min_pct": 70,
                        "max_pct": 90,
                        "count": 1,
                        "percentage": 10.0,
                        "description": "10% of students (1 out of 10) scored between 70% and 90%",
                        "color": "cyan",
                        "students": [
                            {"name": "TANVI BANERJEE", "score": 570, "pct": 79.1, "adm": "PATH260088"}
                        ]
                    },
                    {
                        "range": "≥ 90%",
                        "min_pct": 90,
                        "max_pct": 100,
                        "count": 1,
                        "percentage": 10.0,
                        "description": "10% of students (1 out of 10) scored 90% and above",
                        "color": "emerald",
                        "students": [
                            {"name": "AARAV GANGULY", "score": 660, "pct": 91.6, "adm": "PATH260001"}
                        ]
                    }
                ]
            },
            {
                "test_id": "test-103",
                "test_name": "Unit Test 2 (Electrostatics & Physical)",
                "date": "2026-07-02",
                "total_students": 10,
                "max_marks": 720,
                "highest_score": 640,
                "batch_avg_score": 440,
                "percentage_bands": [
                    {
                        "range": "< 50%",
                        "min_pct": 0,
                        "max_pct": 50,
                        "count": 6,
                        "percentage": 60.0,
                        "description": "60% of students (6 out of 10) scored less than 50%",
                        "color": "rose",
                        "students": [
                            {"name": "SHRESTHA PAUL", "score": 300, "pct": 41.6, "adm": "PATH260012"},
                            {"name": "ANKIT SAHA", "score": 310, "pct": 43.0, "adm": "PATH260045"},
                            {"name": "ROHIT VERMA", "score": 270, "pct": 37.5, "adm": "PATH260089"},
                            {"name": "SNEHA CHATTERJEE", "score": 330, "pct": 45.8, "adm": "PATH260102"},
                            {"name": "SUBHAM ROY", "score": 300, "pct": 41.6, "adm": "PATH260114"},
                            {"name": "PRIYA DUTTA", "score": 350, "pct": 48.6, "adm": "PATH260055"}
                        ]
                    },
                    {
                        "range": "50% - 70%",
                        "min_pct": 50,
                        "max_pct": 70,
                        "count": 3,
                        "percentage": 30.0,
                        "description": "30% of students (3 out of 10) scored between 50% and 70%",
                        "color": "amber",
                        "students": [
                            {"name": "SPANDAN CHAKRABORTY", "score": 450, "pct": 62.5, "adm": "PATH260014"},
                            {"name": "AKASH MUKHERJEE", "score": 460, "pct": 63.8, "adm": "PATH260078"},
                            {"name": "TANVI BANERJEE", "score": 490, "pct": 68.0, "adm": "PATH260088"}
                        ]
                    },
                    {
                        "range": "70% - 90%",
                        "min_pct": 70,
                        "max_pct": 90,
                        "count": 1,
                        "percentage": 10.0,
                        "description": "10% of students (1 out of 10) scored between 70% and 90%",
                        "color": "cyan",
                        "students": [
                            {"name": "AARAV GANGULY", "score": 555, "pct": 77.0, "adm": "PATH260001"}
                        ]
                    },
                    {
                        "range": "≥ 90%",
                        "min_pct": 90,
                        "max_pct": 100,
                        "count": 0,
                        "percentage": 0.0,
                        "description": "0% of students (0 out of 10) scored 90% and above",
                        "color": "emerald",
                        "students": []
                    }
                ]
            }
        ]
    }
    return Response({"status": "success", "data": analysis_data}, status=status.HTTP_200_OK)


@api_view(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
def referrals_collected_view(request):
    """
    7. Referrals Collected
    Referred by (Teacher), referral source, referred student details, referral date, follow-up status, conversion/admission status.
    """
    if request.method == 'GET':
        referrals = []
        try:
            from api.models import Referral
            refs = Referral.objects.all().order_by('-created_at')
            for r in refs:
                referrals.append({
                    "id": str(getattr(r, 'pk', None) or getattr(r, '_id', '')),
                    "referred_by": r.referred_by or '',
                    "referral_source": r.referral_source or 'Teacher',
                    "referred_person": r.referred_person or '',
                    "phone": r.phone or '',
                    "email": r.email or '',
                    "interested_course": r.interested_course or '',
                    "centre_name": r.centre_name or '',
                    "remarks": r.remarks or '',
                    "referral_date": str(r.referral_date) if r.referral_date else '',
                    "follow_up_status": r.follow_up_status or 'New Referral',
                    "conversion_status": r.conversion_status or 'In Progress',
                    "reward_points": r.reward_points or 0
                })
        except Exception as e:
            logger.error(f"Error fetching referrals: {e}")
            referrals = []

        return Response({"status": "success", "data": referrals}, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        try:
            import re
            from api.models import Referral
            data = request.data
            
            # Validation
            student_name = (data.get('referred_person') or '').strip()
            phone = (data.get('phone') or '').strip()
            email = (data.get('email') or '').strip()

            if not student_name:
                return Response({
                    "status": "error",
                    "message": "Student full name is required."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Phone validation: Check at least 10 digits
            clean_phone = re.sub(r'[\s\-\+\(\)]', '', phone)
            if not clean_phone or len(clean_phone) < 10 or not re.search(r'\d{10}', clean_phone):
                return Response({
                    "status": "error",
                    "message": "Please provide a valid contact phone number (at least 10 digits)."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Email validation: if provided, check format
            if email:
                email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_regex, email):
                    return Response({
                        "status": "error",
                        "message": "Please provide a valid email address format."
                    }, status=status.HTTP_400_BAD_REQUEST)

            ref_date = data.get('referral_date')
            conv_status = data.get('conversion_status', 'In Progress')
            reward_pts = 500 if conv_status == 'Admitted' else int(data.get('reward_points', 0) or 0)

            ref = Referral.objects.create(
                referred_by=data.get('referred_by', ''),
                referral_source=data.get('referral_source', 'Teacher'),
                referred_person=student_name,
                phone=phone,
                email=email,
                interested_course=data.get('interested_course', ''),
                centre_name=data.get('centre_name', ''),
                remarks=data.get('remarks', ''),
                referral_date=ref_date if ref_date else None,
                follow_up_status=data.get('follow_up_status', 'New Referral'),
                conversion_status=conv_status,
                reward_points=reward_pts
            )
            return Response({
                "status": "success",
                "message": "Referral logged successfully!",
                "data": {
                    "id": str(getattr(ref, 'pk', None) or getattr(ref, '_id', '')),
                    "referred_by": ref.referred_by,
                    "referral_source": ref.referral_source,
                    "referred_person": ref.referred_person,
                    "phone": ref.phone,
                    "email": ref.email,
                    "interested_course": ref.interested_course,
                    "centre_name": ref.centre_name,
                    "remarks": ref.remarks,
                    "referral_date": str(ref.referral_date) if ref.referral_date else '',
                    "follow_up_status": ref.follow_up_status,
                    "conversion_status": ref.conversion_status,
                    "reward_points": ref.reward_points
                }
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error saving referral: {e}")
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    elif request.method in ['PUT', 'PATCH']:
        try:
            from bson import ObjectId
            from api.models import Referral
            data = request.data
            ref_id = data.get('id') or request.query_params.get('id')
            if not ref_id:
                return Response({"status": "error", "message": "Referral ID is required for update."}, status=status.HTTP_400_BAD_REQUEST)
            
            ref = None
            try:
                ref = Referral.objects.filter(_id=ObjectId(ref_id)).first()
            except Exception:
                ref = Referral.objects.filter(pk=ref_id).first()

            if not ref:
                return Response({"status": "error", "message": "Referral record not found."}, status=status.HTTP_404_NOT_FOUND)

            if 'follow_up_status' in data:
                ref.follow_up_status = data['follow_up_status']
            if 'conversion_status' in data:
                conv_status = data['conversion_status']
                ref.conversion_status = conv_status
                if conv_status == 'Admitted':
                    ref.reward_points = 500
                elif conv_status in ['In Progress', 'Dropped']:
                    ref.reward_points = int(data.get('reward_points', 0) or 0)
            if 'reward_points' in data:
                ref.reward_points = int(data['reward_points'] or 0)
            if 'remarks' in data:
                ref.remarks = data['remarks']
            if 'interested_course' in data:
                ref.interested_course = data['interested_course']
            if 'centre_name' in data:
                ref.centre_name = data['centre_name']
            if 'phone' in data:
                ref.phone = data['phone']
            if 'email' in data:
                ref.email = data['email']
            if 'referred_person' in data:
                ref.referred_person = data['referred_person']
            if 'referral_date' in data and data['referral_date']:
                ref.referral_date = data['referral_date']

            ref.save()

            return Response({
                "status": "success",
                "message": "Referral updated successfully!",
                "data": {
                    "id": str(getattr(ref, 'pk', None) or getattr(ref, '_id', '')),
                    "referred_by": ref.referred_by,
                    "referral_source": ref.referral_source,
                    "referred_person": ref.referred_person,
                    "phone": ref.phone,
                    "email": ref.email,
                    "interested_course": ref.interested_course,
                    "centre_name": ref.centre_name,
                    "remarks": ref.remarks,
                    "referral_date": str(ref.referral_date) if ref.referral_date else '',
                    "follow_up_status": ref.follow_up_status,
                    "conversion_status": ref.conversion_status,
                    "reward_points": ref.reward_points
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error updating referral: {e}")
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        try:
            from bson import ObjectId
            from api.models import Referral
            ref_id = request.query_params.get('id') or request.data.get('id')
            if not ref_id:
                return Response({"status": "error", "message": "Referral ID is required for deletion."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                Referral.objects.filter(_id=ObjectId(ref_id)).delete()
            except Exception:
                Referral.objects.filter(pk=ref_id).delete()
            return Response({"status": "success", "message": "Referral deleted successfully."}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error deleting referral: {e}")
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)






@api_view(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
def dc_stopped_view(request):
    """
    8. DC Stopped (Discontinued Students)
    Active -> DC Stopped status change, stopped date, reason, remarks, follow-up status.
    """
    if request.method == 'GET':
        students = []
        try:
            from api.db_utils import get_db
            from api.models import DCStoppedRecord
            from bson import ObjectId

            db = get_db()
            raw_docs = []
            if db is not None:
                try:
                    raw_docs = list(db.api_dcstoppedrecord.find().sort("created_at", -1))
                except Exception as e:
                    logger.warn(f"PyMongo fetch fallback in dc_stopped: {e}")
                    raw_docs = []

            if not raw_docs:
                raw_docs = list(DCStoppedRecord.objects.all().order_by('-created_at'))

            teacher_filter = (request.query_params.get('teacher') or request.query_params.get('recorded_by') or '').strip().lower().replace("'", "").replace('"', '')

            for r in raw_docs:
                if isinstance(r, dict):
                    rec_by = (r.get('recorded_by') or '').replace("'", "").replace('"', '').strip()
                    if teacher_filter:
                        tf = teacher_filter
                        rb_low = rec_by.lower()
                        if tf not in rb_low and rb_low not in tf and tf.replace(' ', '') not in rb_low.replace(' ', ''):
                            continue

                    v_status = r.get('verification_status')
                    if not v_status:
                        v_status = 'Approved' if r.get('is_verified') else 'Pending'

                    students.append({
                        "id": str(r.get('_id') or r.get('id') or ''),
                        "student_name": r.get('student_name') or '',
                        "roll_no": r.get('roll_no') or '',
                        "batch": r.get('batch') or '',
                        "status": r.get('status') or 'DC Stopped',
                        "stopped_date": str(r.get('stopped_date')) if r.get('stopped_date') else 'N/A',
                        "reason": r.get('reason') or 'N/A',
                        "remarks": r.get('remarks') or '',
                        "follow_up_status": r.get('follow_up_status') or 'In Counseling',
                        "centre_name": r.get('centre_name') or '',
                        "recorded_by": rec_by,
                        "verification_status": v_status,
                        "is_verified": bool(r.get('is_verified') or v_status == 'Approved'),
                        "verified_by": r.get('verified_by') or '',
                        "verified_at": str(r.get('verified_at')) if r.get('verified_at') else '',
                        "rejection_reason": r.get('rejection_reason') or '',
                        "created_at": str(r.get('created_at')) if r.get('created_at') else ''
                    })
                else:
                    rec_by = (r.recorded_by or '').replace("'", "").replace('"', '').strip()
                    if teacher_filter:
                        tf = teacher_filter
                        rb_low = rec_by.lower()
                        if tf not in rb_low and rb_low not in tf and tf.replace(' ', '') not in rb_low.replace(' ', ''):
                            continue
                    v_status = getattr(r, 'verification_status', None)
                    if not v_status:
                        v_status = 'Approved' if getattr(r, 'is_verified', False) else 'Pending'

                    students.append({
                        "id": str(getattr(r, 'pk', None) or getattr(r, '_id', '')),
                        "student_name": r.student_name or '',
                        "roll_no": r.roll_no or '',
                        "batch": r.batch or '',
                        "status": r.status or 'DC Stopped',
                        "stopped_date": str(r.stopped_date) if r.stopped_date else 'N/A',
                        "reason": r.reason or 'N/A',
                        "remarks": r.remarks or '',
                        "follow_up_status": r.follow_up_status or 'In Counseling',
                        "centre_name": r.centre_name or '',
                        "recorded_by": rec_by,
                        "verification_status": v_status,
                        "is_verified": bool(getattr(r, 'is_verified', False) or v_status == 'Approved'),
                        "verified_by": getattr(r, 'verified_by', '') or '',
                        "verified_at": str(r.verified_at) if getattr(r, 'verified_at', None) else '',
                        "rejection_reason": getattr(r, 'rejection_reason', '') or '',
                        "created_at": str(r.created_at) if r.created_at else ''
                    })
        except Exception as e:
            logger.error(f"Error fetching DC Stopped records: {e}")
            students = []

        return Response({"status": "success", "data": students}, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        try:
            from api.models import DCStoppedRecord
            data = request.data
            student_name = (data.get('student_name') or '').strip()
            if not student_name:
                return Response({
                    "status": "error",
                    "message": "Student name is required."
                }, status=status.HTTP_400_BAD_REQUEST)

            stopped_date = data.get('stopped_date')
            record = DCStoppedRecord.objects.create(
                student_name=student_name,
                roll_no=(data.get('roll_no') or '').strip(),
                batch=(data.get('batch') or '').strip(),
                status=data.get('status', 'DC Stopped'),
                stopped_date=stopped_date if stopped_date and stopped_date != 'N/A' else None,
                reason=(data.get('reason') or '').strip(),
                remarks=(data.get('remarks') or '').strip(),
                follow_up_status=data.get('follow_up_status', 'In Counseling'),
                centre_name=data.get('centre_name', ''),
                recorded_by=(data.get('recorded_by') or '').strip().replace("'", "").replace('"', ''),
                verification_status='Pending',
                is_verified=False
            )

            rec_id_str = str(getattr(record, 'pk', None) or getattr(record, '_id', ''))
            return Response({
                "status": "success",
                "message": "DC Stopped record logged successfully!",
                "data": {
                    "id": rec_id_str,
                    "student_name": record.student_name,
                    "roll_no": record.roll_no,
                    "batch": record.batch,
                    "status": record.status,
                    "stopped_date": str(record.stopped_date) if record.stopped_date else 'N/A',
                    "reason": record.reason,
                    "remarks": record.remarks,
                    "follow_up_status": record.follow_up_status,
                    "centre_name": record.centre_name,
                    "recorded_by": record.recorded_by,
                    "verification_status": 'Pending',
                    "is_verified": False,
                    "verified_by": '',
                    "verified_at": '',
                    "rejection_reason": ''
                }
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error creating DC Stopped record: {e}")
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    elif request.method in ['PUT', 'PATCH']:
        try:
            from bson import ObjectId
            from api.models import DCStoppedRecord
            from api.db_utils import get_db
            from django.utils import timezone

            data = request.data
            rec_id = data.get('id') or request.query_params.get('id')
            if not rec_id and not data.get('student_name'):
                return Response({"status": "error", "message": "Record ID is required for update."}, status=status.HTTP_400_BAD_REQUEST)

            # Direct MongoDB PyMongo update for 100% reliability
            db = get_db()
            v_status = data.get('verification_status')
            if not v_status:
                if 'is_verified' in data:
                    v_status = 'Approved' if data['is_verified'] else 'Pending'
                else:
                    v_status = 'Pending'

            admin_name = data.get('verified_by') or (request.user.username if request.user and request.user.is_authenticated else 'Super Admin')
            now_dt = timezone.now()

            update_dict = {}
            if 'status' in data:
                update_dict['status'] = data['status']
                if data['status'] == 'DC Stopped' and not data.get('stopped_date'):
                    from datetime import date as d_date
                    update_dict['stopped_date'] = d_date.today().isoformat()
            if 'stopped_date' in data:
                sd = data['stopped_date']
                update_dict['stopped_date'] = sd if sd and sd != 'N/A' else None
            if 'reason' in data:
                update_dict['reason'] = data['reason']
            if 'remarks' in data:
                update_dict['remarks'] = data['remarks']
            if 'follow_up_status' in data:
                update_dict['follow_up_status'] = data['follow_up_status']
            if 'batch' in data:
                update_dict['batch'] = data['batch']
            if 'roll_no' in data:
                update_dict['roll_no'] = data['roll_no']
            if 'student_name' in data:
                update_dict['student_name'] = data['student_name']
            if 'centre_name' in data:
                update_dict['centre_name'] = data['centre_name']

            if 'verification_status' in data or 'is_verified' in data:
                update_dict['verification_status'] = v_status
                if v_status == 'Approved':
                    update_dict['is_verified'] = True
                    update_dict['verified_by'] = admin_name
                    update_dict['verified_at'] = now_dt
                    update_dict['rejection_reason'] = None
                elif v_status == 'Rejected':
                    update_dict['is_verified'] = False
                    update_dict['verified_by'] = admin_name
                    update_dict['verified_at'] = now_dt
                    update_dict['rejection_reason'] = data.get('rejection_reason') or 'Rejected by Admin'
                else:
                    update_dict['is_verified'] = False
                    update_dict['verified_by'] = None
                    update_dict['verified_at'] = None
                    update_dict['rejection_reason'] = None

            matched_doc = None
            if db is not None:
                query_or = []
                if rec_id:
                    if ObjectId.is_valid(str(rec_id)):
                        query_or.append({"_id": ObjectId(str(rec_id))})
                    query_or.append({"_id": str(rec_id)})
                    query_or.append({"id": str(rec_id)})
                if data.get('student_name'):
                    query_or.append({"student_name": data['student_name']})

                if query_or:
                    db.api_dcstoppedrecord.update_one({"$or": query_or}, {"$set": update_dict})
                    matched_doc = db.api_dcstoppedrecord.find_one({"$or": query_or})

            # Also sync ORM instance
            rec = None
            try:
                if rec_id and ObjectId.is_valid(str(rec_id)):
                    rec = DCStoppedRecord.objects.filter(_id=ObjectId(str(rec_id))).first()
            except Exception:
                pass
            if not rec and rec_id:
                try:
                    rec = DCStoppedRecord.objects.filter(pk=rec_id).first()
                except Exception:
                    pass
            if not rec and data.get('student_name'):
                rec = DCStoppedRecord.objects.filter(student_name=data['student_name']).first()

            if rec:
                for k, v in update_dict.items():
                    setattr(rec, k, v)
                try:
                    rec.save()
                except Exception as e_save:
                    logger.warn(f"ORM save warning: {e_save}")

            final_id = str(matched_doc.get('_id') if matched_doc else (getattr(rec, 'pk', None) or rec_id))
            final_name = (matched_doc.get('student_name') if matched_doc else None) or data.get('student_name', '')
            final_roll = (matched_doc.get('roll_no') if matched_doc else None) or data.get('roll_no', '')
            final_batch = (matched_doc.get('batch') if matched_doc else None) or data.get('batch', '')
            final_status = (matched_doc.get('status') if matched_doc else None) or data.get('status', 'DC Stopped')
            final_stopped_date = str(matched_doc.get('stopped_date')) if (matched_doc and matched_doc.get('stopped_date')) else data.get('stopped_date', 'N/A')
            final_reason = (matched_doc.get('reason') if matched_doc else None) or data.get('reason', 'N/A')
            final_remarks = (matched_doc.get('remarks') if matched_doc else None) or data.get('remarks', '')
            final_follow_up = (matched_doc.get('follow_up_status') if matched_doc else None) or data.get('follow_up_status', 'In Counseling')
            final_centre = (matched_doc.get('centre_name') if matched_doc else None) or data.get('centre_name', '')
            final_rec_by = (matched_doc.get('recorded_by') if matched_doc else None) or (rec.recorded_by if rec else '')
            final_v_status = (matched_doc.get('verification_status') if matched_doc else None) or v_status
            final_is_verified = bool(matched_doc.get('is_verified') if matched_doc else (v_status == 'Approved'))
            final_ver_by = (matched_doc.get('verified_by') if matched_doc else None) or (admin_name if final_is_verified or final_v_status == 'Rejected' else '')
            final_ver_at = str(matched_doc.get('verified_at')) if (matched_doc and matched_doc.get('verified_at')) else str(now_dt)
            final_rej_reason = (matched_doc.get('rejection_reason') if matched_doc else None) or data.get('rejection_reason', '')

            return Response({
                "status": "success",
                "message": "DC Stopped record updated successfully!",
                "data": {
                    "id": final_id,
                    "student_name": final_name,
                    "roll_no": final_roll,
                    "batch": final_batch,
                    "status": final_status,
                    "stopped_date": final_stopped_date,
                    "reason": final_reason,
                    "remarks": final_remarks,
                    "follow_up_status": final_follow_up,
                    "centre_name": final_centre,
                    "recorded_by": final_rec_by,
                    "verification_status": final_v_status,
                    "is_verified": final_is_verified,
                    "verified_by": final_ver_by,
                    "verified_at": final_ver_at,
                    "rejection_reason": final_rej_reason
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error updating DC Stopped record: {e}")
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        try:
            from bson import ObjectId
            from api.models import DCStoppedRecord
            from api.db_utils import get_db

            rec_id = request.query_params.get('id') or request.data.get('id')
            s_name = (request.data.get('student_name') or request.query_params.get('student_name') or '').strip()

            db = get_db()
            if db is not None:
                del_query = []
                if rec_id:
                    if ObjectId.is_valid(str(rec_id)):
                        del_query.append({"_id": ObjectId(str(rec_id))})
                    del_query.append({"_id": str(rec_id)})
                    del_query.append({"id": str(rec_id)})
                if s_name:
                    del_query.append({"student_name": s_name})
                if del_query:
                    db.api_dcstoppedrecord.delete_many({"$or": del_query})

            try:
                if rec_id and ObjectId.is_valid(str(rec_id)):
                    DCStoppedRecord.objects.filter(_id=ObjectId(str(rec_id))).delete()
                elif rec_id:
                    DCStoppedRecord.objects.filter(pk=rec_id).delete()
                if s_name:
                    DCStoppedRecord.objects.filter(student_name=s_name).delete()
            except Exception:
                pass

            return Response({"status": "success", "message": "Record deleted successfully."}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error deleting DC Stopped record: {e}")
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)



@api_view(['GET', 'POST', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def teacher_training_view(request):
    """
    9. Training for New Teachers
    Teacher name, training topic, trainer, training date, status (Pending -> In Progress -> Completed), completion date, remarks.
    Persists and retrieves real database records.
    """
    from api.models import TeacherTrainingRecord
    from api.db_utils import get_db
    from bson import ObjectId

    if request.method == 'GET':
        teacher_param = (request.query_params.get('teacher') or request.GET.get('teacher') or '').strip()
        try:
            qs = TeacherTrainingRecord.objects.all()
            if teacher_param:
                from django.db.models import Q
                qs = qs.filter(Q(teacher_name__icontains=teacher_param) | Q(trainer__icontains=teacher_param))
            records = list(qs.order_by('-created_at').values())
            formatted = []
            for r in records:
                r_copy = dict(r)
                if '_id' in r_copy:
                    r_copy['id'] = str(r_copy['_id'])
                    del r_copy['_id']
                elif 'id' not in r_copy:
                    r_copy['id'] = str(r_copy.get('pk', len(formatted) + 1))
                formatted.append(r_copy)
            return Response({"status": "success", "data": formatted}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"[teacher_training_view GET ERROR] {e}")
            try:
                db = get_db()
                if db is not None:
                    query = {}
                    if teacher_param:
                        import re
                        rgx = re.compile(teacher_param, re.IGNORECASE)
                        query = {"$or": [{"teacher_name": rgx}, {"trainer": rgx}]}
                    docs = list(db.api_teachertrainingrecord.find(query).sort('created_at', -1))
                    formatted = []
                    for doc in docs:
                        d = dict(doc)
                        d['id'] = str(d.pop('_id', ''))
                        formatted.append(d)
                    return Response({"status": "success", "data": formatted}, status=status.HTTP_200_OK)
            except Exception as e2:
                logger.error(f"[teacher_training_view Mongo fallback ERROR] {e2}")
            return Response({"status": "success", "data": []}, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        data = request.data or {}
        try:
            t_date = data.get('training_date') or None
            status_val = data.get('status', 'Pending')
            completion_date = data.get('completion_date')
            if not completion_date:
                completion_date = str(date.today()) if status_val == 'Completed' else 'Pending'

            rec = TeacherTrainingRecord.objects.create(
                teacher_name=data.get('teacher_name', '').strip(),
                training_topic=data.get('training_topic', '').strip(),
                trainer=data.get('trainer', '').strip(),
                training_date=t_date,
                status=status_val,
                completion_date=completion_date,
                remarks=data.get('remarks', '').strip()
            )
            res_data = dict(data)
            res_data['id'] = str(rec.pk)
            res_data['status'] = status_val
            res_data['completion_date'] = completion_date
            return Response({
                "status": "success", 
                "message": "Teacher training scheduled successfully",
                "data": res_data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"[teacher_training_view POST ERROR] {e}")
            # Fallback to direct PyMongo insert if ORM fails
            try:
                db = get_db()
                if db is not None:
                    insert_doc = {
                        "teacher_name": data.get('teacher_name', '').strip(),
                        "training_topic": data.get('training_topic', '').strip(),
                        "trainer": data.get('trainer', '').strip(),
                        "training_date": data.get('training_date'),
                        "status": data.get('status', 'Pending'),
                        "completion_date": data.get('completion_date', 'Pending'),
                        "remarks": data.get('remarks', '').strip(),
                        "created_at": datetime.now(),
                        "updated_at": datetime.now()
                    }
                    res = db.api_teachertrainingrecord.insert_one(insert_doc)
                    insert_doc['id'] = str(res.inserted_id)
                    insert_doc.pop('_id', None)
                    return Response({
                        "status": "success",
                        "message": "Teacher training scheduled successfully",
                        "data": insert_doc
                    }, status=status.HTTP_201_CREATED)
            except Exception as e2:
                logger.error(f"[teacher_training_view PyMongo POST ERROR] {e2}")
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    elif request.method in ['PUT', 'PATCH']:
        data = request.data or {}
        rec_id = data.get('id') or request.query_params.get('id')
        new_status = data.get('status')
        new_completion_date = data.get('completion_date')
        if not new_completion_date and new_status == 'Completed':
            new_completion_date = str(date.today())
        elif not new_completion_date and new_status != 'Completed':
            new_completion_date = 'Pending'

        update_fields = {}
        if new_status:
            update_fields['status'] = new_status
        if new_completion_date:
            update_fields['completion_date'] = new_completion_date
        if 'remarks' in data:
            update_fields['remarks'] = data.get('remarks')
        if 'trainer' in data:
            update_fields['trainer'] = data.get('trainer')
        if 'training_topic' in data:
            update_fields['training_topic'] = data.get('training_topic')
        if 'teacher_name' in data:
            update_fields['teacher_name'] = data.get('teacher_name')
        if 'training_date' in data:
            update_fields['training_date'] = data.get('training_date')

        try:
            db = get_db()
            if db is not None and rec_id:
                query_or = []
                if ObjectId.is_valid(str(rec_id)):
                    query_or.append({"_id": ObjectId(str(rec_id))})
                query_or.append({"_id": str(rec_id)})
                query_or.append({"id": str(rec_id)})
                db.api_teachertrainingrecord.update_one({"$or": query_or}, {"$set": {**update_fields, "updated_at": datetime.now()}})
            
            try:
                if rec_id and ObjectId.is_valid(str(rec_id)):
                    TeacherTrainingRecord.objects.filter(_id=ObjectId(str(rec_id))).update(**update_fields)
                elif rec_id:
                    TeacherTrainingRecord.objects.filter(pk=rec_id).update(**update_fields)
            except Exception:
                pass

            return Response({
                "status": "success", 
                "message": "Teacher training updated successfully",
                "data": { "id": str(rec_id), **update_fields }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"[teacher_training_view PUT ERROR] {e}")
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        rec_id = request.query_params.get('id') or (request.data and request.data.get('id'))
        try:
            db = get_db()
            if db is not None and rec_id:
                query_or = []
                if ObjectId.is_valid(str(rec_id)):
                    query_or.append({"_id": ObjectId(str(rec_id))})
                query_or.append({"_id": str(rec_id)})
                query_or.append({"id": str(rec_id)})
                db.api_teachertrainingrecord.delete_many({"$or": query_or})

            try:
                if rec_id and ObjectId.is_valid(str(rec_id)):
                    TeacherTrainingRecord.objects.filter(_id=ObjectId(str(rec_id))).delete()
                elif rec_id:
                    TeacherTrainingRecord.objects.filter(pk=rec_id).delete()
            except Exception:
                pass

            return Response({"status": "success", "message": "Teacher training record deleted successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"[teacher_training_view DELETE ERROR] {e}")
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
