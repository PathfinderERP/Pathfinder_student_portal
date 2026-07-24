import sys

bulk_code = '''
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def get_admin_teacher_activity_summary_bulk(request):
    user = request.user
    if user.user_type not in ['superadmin', 'admin', 'faculty', 'staff', 'teacher']:
        return response.Response({"error": "Unauthorized"}, status=403)

    usernames = request.data.get('usernames', [])
    if not usernames:
        return response.Response({})

    from django.contrib.auth import get_user_model
    User = get_user_model()
    teachers = User.objects.filter(username__in=usernames)
    
    teacher_emails = {t.username: t.email for t in teachers if t.email}
    
    from django.db.models import Count, Max, Avg, Q
    from api.models import Doubt, ClassFeedback
    
    # Pre-fetch counts
    login_counts = dict(LoginLog.objects.filter(username__in=usernames).values('username').annotate(c=Count('id')).values_list('username', 'c'))
    last_logins = dict(LoginLog.objects.filter(username__in=usernames, status='Success').values('username').annotate(m=Max('created_at')).values_list('username', 'm'))
    
    # We will do a basic loop for the specific queries if needed, or query them and group in python
    teacher_q = Q(teacher_id__in=usernames)
    if teacher_emails:
        teacher_q |= Q(teacher_id__in=teacher_emails.values())
        
    doubts = list(Doubt.objects.filter(teacher_q, status='Resolved').values('teacher_id'))
    feedbacks = list(ClassFeedback.objects.filter(teacher_q).values('teacher_id', 'average_score'))
    
    doubt_counts = {}
    for d in doubts:
        tid = d['teacher_id']
        doubt_counts[tid] = doubt_counts.get(tid, 0) + 1
        
    fb_stats = {}
    for f in feedbacks:
        tid = f['teacher_id']
        if tid not in fb_stats:
            fb_stats[tid] = {'sum': 0.0, 'count': 0}
        fb_stats[tid]['sum'] += f['average_score']
        fb_stats[tid]['count'] += 1

    results = {}
    for username in usernames:
        email = teacher_emails.get(username)
        dc = doubt_counts.get(username, 0)
        if email:
            dc += doubt_counts.get(email, 0)
            
        fc = fb_stats.get(username, {'sum':0.0, 'count':0})
        if email and email in fb_stats:
            fc['sum'] += fb_stats[email]['sum']
            fc['count'] += fb_stats[email]['count']
            
        avg_fb = round(fc['sum']/fc['count'], 1) if fc['count'] > 0 else 0.0
        
        la = last_logins.get(username)
        
        results[username] = {
            'loginCount': login_counts.get(username, 0),
            'lastActive': la.isoformat() if la else None,
            'doubtsSolved': dc,
            'feedbackCount': fc['count'],
            'averageFeedback': avg_fb
        }

    return response.Response(results)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_admin_teacher_activity_detail(request, username):
    user = request.user
    if user.user_type not in ['superadmin', 'admin', 'faculty', 'staff', 'teacher']:
        return response.Response({"error": "Unauthorized"}, status=403)

    activity_type = request.query_params.get('type')
    from django.contrib.auth import get_user_model
    User = get_user_model()
    teacher = User.objects.filter(username=username).first()
    if not teacher:
        return response.Response([])

    if activity_type == 'logins':
        logs = LoginLog.objects.filter(username=teacher.username).order_by('-created_at')[:100]
        data = [{'created_at': log.created_at.isoformat(), 'ip_address': log.ip_address, 'status': log.status, 'user_agent': log.user_agent} for log in logs]
        return response.Response(data)
        
    elif activity_type == 'doubts':
        from api.models import Doubt
        from django.db.models import Q
        teacher_id_q = Q(teacher_id=teacher.username)
        if teacher.email: teacher_id_q |= Q(teacher_id=teacher.email)
        doubts = Doubt.objects.filter(teacher_id_q, status='Resolved').order_by('-resolved_at')[:100]
        data = [{'title': d.title, 'student_name': d.student_name, 'subject': d.subject, 'resolved_at': d.resolved_at.isoformat() if d.resolved_at else None, 'status': d.status} for d in doubts]
        return response.Response(data)
        
    elif activity_type == 'feedbacks':
        from api.models import ClassFeedback
        from django.db.models import Q
        teacher_id_q = Q(teacher_id=teacher.username)
        if teacher.email: teacher_id_q |= Q(teacher_id=teacher.email)
        feedbacks = ClassFeedback.objects.filter(teacher_id_q).order_by('-created_at')[:100]
        data = [{'date_of_class': d.date_of_class.isoformat() if d.date_of_class else None, 'subject': d.subject, 'student': d.student.username if d.student else 'Unknown', 'average_score': d.average_score, 'created_at': d.created_at.isoformat()} for d in feedbacks]
        return response.Response(data)

    return response.Response([])
'''

with open(r'f:\student portal\backend\api\views.py', 'r', encoding='utf-8') as f:
    content = f.read()

with open(r'f:\student portal\backend\api\views.py', 'w', encoding='utf-8') as f:
    f.write(content + '\n' + bulk_code)
