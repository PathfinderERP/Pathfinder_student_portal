import sys

bulk_student_code = '''
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def get_admin_student_activity_summary_bulk(request):
    user = request.user
    if user.user_type not in ['superadmin', 'admin', 'faculty', 'staff', 'teacher']:
        return response.Response({"error": "Unauthorized"}, status=403)

    admission_numbers = request.data.get('admission_numbers', [])
    if not admission_numbers:
        return response.Response({})

    from django.contrib.auth import get_user_model
    User = get_user_model()
    students = User.objects.filter(username__in=admission_numbers)
    
    from django.db.models import Count, Max, Sum
    
    # Batch logins
    login_counts = dict(LoginLog.objects.filter(username__in=admission_numbers).values('username').annotate(c=Count('id')).values_list('username', 'c'))
    last_logins = dict(LoginLog.objects.filter(username__in=admission_numbers, status='Success').values('username').annotate(m=Max('created_at')).values_list('username', 'm'))
    
    # Batch videos and tests
    student_ids = [s.id for s in students]
    video_logs = UserActivityLog.objects.filter(user_id__in=student_ids, activity_type__startswith='video_')
    
    videos_watched_map = {}
    for log in video_logs:
        uid = log.user_id
        vid = log.metadata.get('video_id') or log.metadata.get('video_title')
        if uid not in videos_watched_map:
            videos_watched_map[uid] = set()
        if vid:
            videos_watched_map[uid].add(vid)
            
    from tests.models import TestSubmission
    tests_taken = dict(TestSubmission.objects.filter(student_id__in=student_ids).values('student_id').annotate(c=Count('id')).values_list('student_id', 'c'))
    
    # Batch heartbeats
    heartbeats = dict(UserActivityLog.objects.filter(user_id__in=student_ids, activity_type='heartbeat').values('student_id').annotate(s=Sum('duration')).values_list('user_id', 's'))
    test_times = dict(TestSubmission.objects.filter(student_id__in=student_ids).values('student_id').annotate(s=Sum('time_spent')).values_list('student_id', 's'))

    results = {}
    for student in students:
        username = student.username
        uid = student.id
        
        la = last_logins.get(username)
        vw = len(videos_watched_map.get(uid, set()))
        tt = tests_taken.get(uid, 0)
        
        hb_time = heartbeats.get(uid) or 0
        ts_time = test_times.get(uid) or 0
        total_study = hb_time + ts_time
        
        results[username] = {
            'loginCount': login_counts.get(username, 0),
            'lastActive': la.isoformat() if la else None,
            'videosWatched': vw,
            'testsTaken': tt,
            'testsTotal': 0, # Not calculating total tests for bulk to save time
            'totalStudyTimeSeconds': total_study,
            'attendancePresent': None,
            'attendanceTotal': None
        }

    return response.Response(results)
'''

with open(r'f:\student portal\backend\api\views.py', 'r', encoding='utf-8') as f:
    content = f.read()

with open(r'f:\student portal\backend\api\views.py', 'w', encoding='utf-8') as f:
    f.write(content + '\n' + bulk_student_code)
