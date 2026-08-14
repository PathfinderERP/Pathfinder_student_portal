from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, date, timedelta

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

        # Failsafe: if center_filter or batch_filter is not supplied, look up assigned centres & Class-Batch Map for authenticated teacher
        if request.user and request.user.is_authenticated:
            try:
                emp_id = (getattr(request.user, 'employee_id', '') or request.user.username or '').strip().lower()
                u_email = (getattr(request.user, 'email', '') or request.user.username or '').strip().lower()
                from api.erp_views import _get_all_teachers_data_list
                all_t = _get_all_teachers_data_list()
                matched_t = next((t for t in all_t if str(t.get('code','')).strip().lower() == emp_id or str(t.get('employee_id','')).strip().lower() == emp_id or str(t.get('email','')).strip().lower() == u_email), None)
                
                if matched_t and not center_filter:
                    t_centres = matched_t.get('centres') or []
                    if t_centres:
                        center_filter = ", ".join(t_centres)

                if not batch_filter:
                    t_name = matched_t.get('name') if matched_t else f"{getattr(request.user, 'first_name', '')} {getattr(request.user, 'last_name', '')}".strip()
                    t_id = str(matched_t.get('id','')) if matched_t else ''
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

                    if query_conds:
                        fbs = list(db['api_classfeedback'].find({'$or': query_conds}, {'student_id': 1, 'student_batch': 1}))
                        t_batches = set()
                        sids = []
                        for fb in fbs:
                            b = (fb.get('student_batch') or '').strip()
                            if b and b.lower() != 'multiple':
                                t_batches.add(b)
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
            {'$project': {'student_id': 1, 'test_id': 1, 'score': 1, '_id': 0}}
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
                match_c = not allowed_centres_list or (bool(st_c) and any(ac in st_c or st_c in ac for ac in allowed_centres_list))
                match_b = not allowed_batches_list or (bool(st_b) and any(ab in st_b or st_b in ab for ab in allowed_batches_list))
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
            target_tid = int(test_id_param)
            match_exam = next((e for e in published_exams if e['id'] == target_tid), None)
            if match_exam:
                selected_test_id = target_tid
            else:
                selected_test_id = published_exams[0]['id']
        elif test_id_param.lower() == 'all':
            selected_test_id = 'all'
        else:
            selected_test_id = published_exams[0]['id']

        if selected_test_id != 'all':
            test_info = test_map.get(selected_test_id, {})
            selected_test_name = test_info.get('name', f"Exam #{selected_test_id}")
            selected_test_max_marks = float(test_info.get('total_marks') or 100)
            active_submissions = [s for s in submissions if s.get('test_id') == selected_test_id]

            # Extract subject section max marks for selected test
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
                allowed_centres = [c.strip().lower() for c in center_filter.split(',') if c.strip()]
                if allowed_centres:
                    st_c_lower = st_center.lower()
                    if not any(ac in st_c_lower or st_c_lower in ac for ac in allowed_centres if ac):
                        continue

            if batch_filter:
                allowed_batches = [b.strip().lower() for b in batch_filter.split(',') if b.strip()]
                if allowed_batches:
                    st_b_lower = st_batch.lower()
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
                rec['subject_breakdown'][subj_label] = score
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
    4. Mentorship & Conversion
    Student-wise mentorship records, assigned mentor, follow-up tracking, conversion status.
    """
    if request.method == 'GET':
        records = [
            {
                "id": 1,
                "student_name": "Rahul Karmakar",
                "roll_no": "PF-2026-0412",
                "assigned_mentor": "Dr. Rajesh Sharma",
                "mentorship_date": "2026-08-10",
                "remarks": "Reviewed Physics mechanics concepts. Student needs additional practice in Rotational Dynamics.",
                "follow_up_date": "2026-08-20",
                "conversion_type": "Course Extension",
                "conversion_status": "Converted",
                "lead_stage": "Enrolled - Crash Course + Test Series"
            },
            {
                "id": 2,
                "student_name": "Sneha Mukherjee",
                "roll_no": "PF-2026-0520",
                "assigned_mentor": "Anita Verma",
                "mentorship_date": "2026-08-12",
                "remarks": "Organic Chemistry revision guidance provided. Target score set to 160+.",
                "follow_up_date": "2026-08-22",
                "conversion_type": "Admission Lead",
                "conversion_status": "In Progress",
                "lead_stage": "Interested in 2-Year Integrated Program"
            },
            {
                "id": 3,
                "student_name": "Aman Sen",
                "roll_no": "PF-2026-0610",
                "assigned_mentor": "Siddharth Roy",
                "mentorship_date": "2026-08-05",
                "remarks": "Calculus problem-solving speed discussion. Weekly goal set.",
                "follow_up_date": "2026-08-15",
                "conversion_type": "Upgrade",
                "conversion_status": "Pending",
                "lead_stage": "Offered Super 30 Special Batch Upgrade"
            }
        ]
        return Response({"status": "success", "data": records}, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        # Add new mentorship session
        new_data = request.data
        return Response({
            "status": "success",
            "message": "Mentorship record and conversion tracking added successfully",
            "data": new_data
        }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def ptm_records_view(request):
    """
    5. PTM (Parent-Teacher Meeting)
    Student name, Parent name, Teacher name, PTM date, discussion/remarks, performance, issues, follow-up, next PTM date.
    """
    if request.method == 'GET':
        records = [
            {
                "id": 1,
                "student_name": "Aarav Ganguly",
                "parent_name": "Mr. Subhash Ganguly",
                "teacher_name": "Dr. Rajesh Sharma",
                "ptm_date": "2026-08-01",
                "discussion_remarks": "Discussed overall top performance in mock tests. Encouraged to maintain consistency.",
                "student_performance": "Excellent (Rank 1 in Batch)",
                "issues_discussed": "Managing stress during full-syllabus mocks",
                "follow_up_required": True,
                "next_ptm_date": "2026-09-05"
            },
            {
                "id": 2,
                "student_name": "Tanvi Dutta",
                "parent_name": "Mrs. Priya Dutta",
                "teacher_name": "Anita Verma",
                "ptm_date": "2026-07-25",
                "discussion_remarks": "Chemistry marks dropped by 10%. Focused on regular homework completion.",
                "student_performance": "Needs Improvement in Physical Chemistry",
                "issues_discussed": "Time management during weekend unit tests",
                "follow_up_required": True,
                "next_ptm_date": "2026-08-25"
            }
        ]
        return Response({"status": "success", "data": records}, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        return Response({"status": "success", "message": "PTM record created successfully"}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def test_analysis_view(request):
    """
    6. Test Analysis (Student)
    Marks/percentage, Subject-wise performance, Test-wise performance, Rank comparison, Performance improvement tracking.
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
        ]
    }
    return Response({"status": "success", "data": analysis_data}, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def referrals_collected_view(request):
    """
    7. Referrals Collected
    Referred by, referral source, referred person details, referral date, follow-up status, conversion/admission status.
    """
    if request.method == 'GET':
        referrals = [
            {
                "id": 1,
                "referred_by": "Aarav Ganguly (Student)",
                "referral_source": "Student",
                "referred_person": "Vikram Ganguly",
                "phone": "+91 98765 43210",
                "email": "vikram.g@gmail.com",
                "interested_course": "Class 11 Engineering 2-Year Program",
                "referral_date": "2026-08-01",
                "follow_up_status": "Counseled",
                "conversion_status": "Admitted",
                "reward_points": 500
            },
            {
                "id": 2,
                "referred_by": "Dr. Rajesh Sharma (Teacher)",
                "referral_source": "Teacher",
                "referred_person": "Debasmita Paul",
                "phone": "+91 98300 12345",
                "email": "debasmita.p@gmail.com",
                "interested_course": "Repeater Medical Batch",
                "referral_date": "2026-08-05",
                "follow_up_status": "Demo Class Scheduled",
                "conversion_status": "In Progress",
                "reward_points": 0
            }
        ]
        return Response({"status": "success", "data": referrals}, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        return Response({"status": "success", "message": "Referral logged successfully!"}, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT'])
@permission_classes([AllowAny])
def dc_stopped_view(request):
    """
    8. DC Stopped (Discontinued Students)
    Active -> DC Stopped status change, stopped date, reason, remarks, follow-up status.
    """
    if request.method == 'GET':
        students = [
            {
                "id": 1,
                "student_name": "Karan Ghosh",
                "roll_no": "PF-2026-0780",
                "batch": "ENG-11B",
                "status": "DC Stopped",
                "stopped_date": "2026-07-15",
                "reason": "Relocation to Delhi",
                "remarks": "Transferred out due to father's job relocation",
                "follow_up_status": "Completed - Exit Clearance Issued"
            },
            {
                "id": 2,
                "student_name": "Megha Roy",
                "roll_no": "PF-2026-0899",
                "batch": "MED-12B",
                "status": "Active",
                "stopped_date": "N/A",
                "reason": "N/A",
                "remarks": "Regular attendee",
                "follow_up_status": "N/A"
            },
            {
                "id": 3,
                "student_name": "Bikramjit Malo",
                "roll_no": "PF-2026-0912",
                "batch": "MED-11A",
                "status": "DC Stopped",
                "stopped_date": "2026-08-02",
                "reason": "Financial Constraints",
                "remarks": "Offered scholarship revision, parent declined",
                "follow_up_status": "In Counseling"
            }
        ]
        return Response({"status": "success", "data": students}, status=status.HTTP_200_OK)
    
    elif request.method == 'PUT':
        return Response({"status": "success", "message": "Student status updated to DC Stopped"}, status=status.HTTP_200_OK)


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([AllowAny])
def teacher_training_view(request):
    """
    9. Training for New Teachers
    Teacher name, training topic, trainer, training date, status (Pending -> In Progress -> Completed), completion date, remarks.
    """
    if request.method == 'GET':
        modules = [
            {
                "id": 1,
                "teacher_name": "Priyanka Das",
                "training_topic": "Interactive Pedagogy & Smartboard Operations",
                "trainer": "Dr. Rajesh Sharma",
                "training_date": "2026-07-20",
                "status": "Completed",
                "completion_date": "2026-07-25",
                "remarks": "Successfully completed module and passed mock teaching session with 92% rating."
            },
            {
                "id": 2,
                "teacher_name": "Sourav Bhattacharya",
                "training_topic": "Advanced NEET Problem Solving & Doubt Resolution",
                "trainer": "Anita Verma",
                "training_date": "2026-08-01",
                "status": "In Progress",
                "completion_date": "Pending",
                "remarks": "Currently undergoing module 3 (Physical Chemistry Shortcuts)."
            },
            {
                "id": 3,
                "teacher_name": "Rina Paul",
                "training_topic": "ERP Operations, Attendance & Classroom Analytics",
                "trainer": "IT Administrator",
                "training_date": "2026-08-15",
                "status": "Pending",
                "completion_date": "Pending",
                "remarks": "Scheduled for mid-August session."
            }
        ]
        return Response({"status": "success", "data": modules}, status=status.HTTP_200_OK)
    
    elif request.method in ['POST', 'PUT']:
        return Response({"status": "success", "message": "Teacher training status updated"}, status=status.HTTP_200_OK)
