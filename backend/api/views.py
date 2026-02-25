from rest_framework import viewsets, permissions, generics, status, response, views
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import UploadedFile, CustomUser, LoginLog, Grievance, StudyTask, Notice
from .serializers import (
    UploadedFileSerializer, CustomTokenObtainPairSerializer, 
    UserSerializer, UserCreateSerializer, LoginLogSerializer,
    GrievanceSerializer, StudyTaskSerializer, NoticeSerializer
)

class IsSuperAdmin(permissions.BasePermission):
    """
    Custom permission to only allow superadmins to create users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and getattr(request.user, 'user_type', None) == 'superadmin'

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class LoginHistoryView(generics.ListAPIView):
    serializer_class = LoginLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        from .db_utils import get_recent_logs_direct
        logs = get_recent_logs_direct(10)
        return response.Response(logs)

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [IsSuperAdmin]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """
        Override get_object to handle MongoDB ObjectId lookups properly with Djongo
        """
        from bson import ObjectId
        pk = self.kwargs.get('pk')
        try:
            # Try to get the user by _id (MongoDB ObjectId)
            return CustomUser.objects.get(_id=ObjectId(pk))
        except (CustomUser.DoesNotExist, Exception):
            # Fallback to default behavior
            return super().get_object()

    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get('password')
        if not password:
            return response.Response({'error': 'Password is required'}, status=400)
        user.set_password(password)
        user.save()
        return response.Response({'status': 'password set'})

class FileViewSet(viewsets.ModelViewSet):
    queryset = UploadedFile.objects.all()
    serializer_class = UploadedFileSerializer
    permission_classes = [permissions.IsAuthenticated]

class GrievanceViewSet(viewsets.ModelViewSet):
    queryset = Grievance.objects.all()
    serializer_class = GrievanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Minimal queryset needed for DRF routing — actual data served by list() override
        return Grievance.objects.all()

    def _format_doc(self, doc):
        """Convert a raw MongoDB document to a clean dict for JSON response."""
        def safe_str(val):
            return str(val) if val is not None else None

        date_val = doc.get('date')
        if date_val and hasattr(date_val, 'isoformat'):
            date_val = date_val.isoformat()

        return {
            'id':                   safe_str(doc.get('id')),
            'student_name':         doc.get('student_name'),
            'student_id':           doc.get('student_id'),
            'subject':              doc.get('subject'),
            'category':             doc.get('category'),
            'description':          doc.get('description'),
            'priority':             doc.get('priority'),
            'status':               doc.get('status'),
            'date':                 date_val,
            'teacher_name':         doc.get('teacher_name'),
            'teacher_id':           doc.get('teacher_id'),
            'assign_date':          safe_str(doc.get('assign_date')),
            'solved_date':          safe_str(doc.get('solved_date')),
            'solution_description': doc.get('solution_description'),
        }

    def list(self, request, *args, **kwargs):
        """
        Bypass Djongo ORM completely for listing — use PyMongo directly.
        Djongo cannot read CharField values back from MongoDB reliably.
        """
        from .db_utils import get_db
        user = request.user
        user_type = getattr(user, 'user_type', '')
        db = get_db()

        if db is None:
            return response.Response([], status=200)

        try:
            collection = db['api_grievance']

            if user_type in ('admin', 'staff', 'superadmin'):
                docs = list(collection.find().sort('date', -1))
            else:
                student_id_str = str(user.pk)
                docs = list(collection.find({'student_id': student_id_str}).sort('date', -1))
                print(f"[GrievanceViewSet] PyMongo list: found {len(docs)} for student_id={student_id_str}")

            formatted = [self._format_doc(doc) for doc in docs]
            return response.Response(formatted)

        except Exception as e:
            print(f"[GrievanceViewSet] PyMongo list failed: {e}")
            return response.Response([], status=200)


    def perform_create(self, serializer):
        # Automatically set student info if they are a student
        extra_data = {}
        student_name = None
        student_id_str = None

        if self.request.user.user_type == 'student':
            student_name = f"{self.request.user.first_name} {self.request.user.last_name}".strip() if self.request.user.first_name else self.request.user.username
            student_id_str = str(self.request.user.pk)
            extra_data['student_name'] = student_name
            extra_data['student_id'] = student_id_str

            # Default status based on category if not provided
            if 'status' not in self.request.data:
                category = self.request.data.get('category', 'Academic')
                if category in ['Academic', 'Doubt Session']:
                    extra_data['status'] = 'Unassigned'
                else:
                    extra_data['status'] = 'Pending'

        instance = serializer.save(**extra_data)

        # Djongo silently drops ALL CharField/TextField values on save.
        # Patch the full document via PyMongo to write every field correctly.
        try:
            from .db_utils import get_db
            from datetime import datetime
            db = get_db()
            if db is not None:
                # Build the complete document payload from request + extra_data
                payload = {
                    'subject':      self.request.data.get('subject', ''),
                    'category':     self.request.data.get('category', 'Academic'),
                    'description':  self.request.data.get('description', ''),
                    'priority':     self.request.data.get('priority', 'Medium'),
                    'status':       extra_data.get('status', self.request.data.get('status', 'Pending')),
                }
                if student_id_str:
                    payload['student_id'] = student_id_str
                if student_name:
                    payload['student_name'] = student_name

                result = db['api_grievance'].update_one(
                    {'id': instance.pk},
                    {'$set': payload}
                )
                print(f"[GrievanceViewSet] PyMongo full patch on pk={instance.pk}, matched={result.matched_count}, fields={list(payload.keys())}")
        except Exception as e:
            print(f"[GrievanceViewSet] PyMongo patch failed: {e}")

    def destroy(self, request, *args, **kwargs):
        """
        Delete a grievance directly via PyMongo.
        Uses the same lookup strategy as list() — find by student_id, 
        match id in Python, then delete by MongoDB _id.
        """
        from .db_utils import get_db
        pk = kwargs.get('pk')           # string e.g. '84'
        user = request.user
        user_type = getattr(user, 'user_type', '')

        db = get_db()
        if db is not None:
            try:
                collection = db['api_grievance']

                if user_type in ('admin', 'staff', 'superadmin'):
                    # Admin: find all docs, match by id string comparison
                    all_docs = list(collection.find())
                    target = next(
                        (d for d in all_docs if str(d.get('id', '')) == str(pk)),
                        None
                    )
                else:
                    # Student: only search within their own docs (same as list())
                    student_id_str = str(user.pk)
                    student_docs = list(collection.find({'student_id': student_id_str}))
                    target = next(
                        (d for d in student_docs if str(d.get('id', '')) == str(pk)),
                        None
                    )
                    print(f"[GrievanceViewSet] Delete search: student has {len(student_docs)} docs, looking for id={pk!r}, found={target is not None}")

                if target is None:
                    return response.Response({'detail': 'Not found.'}, status=404)

                # Delete by MongoDB _id — always unique and reliable
                result = collection.delete_one({'_id': target['_id']})
                print(f"[GrievanceViewSet] Deleted pk={pk} by _id={target['_id']}, deleted_count={result.deleted_count}")

                # Cleanup ORM record (safe to fail)
                try:
                    Grievance.objects.get(pk=pk).delete()
                except Exception:
                    pass

                return response.Response(status=204)

            except Exception as e:
                print(f"[GrievanceViewSet] PyMongo delete failed: {e}")
                return response.Response({'detail': str(e)}, status=500)

        return super().destroy(request, *args, **kwargs)


class StudyTaskViewSet(viewsets.ModelViewSet):
    serializer_class = StudyTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return tasks for the logged in user
        return StudyTask.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class NoticeViewSet(viewsets.ModelViewSet):
    queryset = Notice.objects.all()
    serializer_class = NoticeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return all public notices AND private notices for this user
        # SIMPLIFICATION: usage of Q objects (OR) triggers RecursionError in some Djongo versions.
        # We will fetch potentially more data and filter in memory if needed, or just prioritize safety.
        try:
             # Try the standard OR query first
            from django.db.models import Q
            return Notice.objects.filter(Q(user__isnull=True) | Q(user=self.request.user))
        except Exception:
            # Fallback: just return all and let the serializer/frontend handle it, 
            # or return just user's notices to be safe.
            print("NoticeViewSet: Q-object query failed, falling back to simple filter")
            return Notice.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        # Check for upcoming tasks and generate notices
        try:
            if request.user.user_type == 'student':
                from datetime import datetime
                from django.utils import timezone
                
                now = timezone.now()
                # Use a simpler query to avoid Djongo recursion issues
                # Fetch tasks by date and user first
                date_tasks = StudyTask.objects.filter(
                    user=request.user,
                    date=now.date()
                )
                
                # In-memory filtering (safe from Djongo parser bugs)
                upcoming_tasks = [t for t in date_tasks if not t.completed]
                
                for task in upcoming_tasks:
                    # Combine date and time to compare
                    task_dt = datetime.combine(task.date, task.time)
                    if timezone.is_aware(now):
                        try:
                            # Try to make it timezone aware, assuming simple default
                            from django.utils.timezone import make_aware
                            task_dt = make_aware(task_dt)
                        except:
                            # Fallback if already aware or other issue
                            pass
                    
                    # Calculate difference in minutes
                    # Ensure both are offset-aware or offset-naive before subtracting
                    if task_dt.tzinfo is None and now.tzinfo is not None:
                         # Make task_dt aware
                         from django.utils.timezone import make_aware
                         # Provide a default timezone if unexpected
                         task_dt = make_aware(task_dt, timezone.get_current_timezone())
                    elif task_dt.tzinfo is not None and now.tzinfo is None:
                         # removing tz from task_dt
                         task_dt = task_dt.replace(tzinfo=None)
                         
                    time_diff = (task_dt - now).total_seconds() / 60
                    
                    if 0 < time_diff <= 30:
                        # Check if notice already exists
                        exists = Notice.objects.filter(
                            user=request.user,
                            title=f"Reminder: {task.topic}",
                            date=now.date()
                        ).exists()
                        
                        if not exists:
                            Notice.objects.create(
                                user=request.user,
                                title=f"Reminder: {task.topic}",
                                content=f"Your study session for '{task.subject} - {task.topic}' starts in {int(time_diff)} minutes.",
                                category='System',
                                is_new=True
                            )
        except Exception as e:
            # Catch errors silently so the notice board still loads even if reminder gen fails
            print(f"Error generating study reminders: {e}")

        # MANUALLY COMBINE PUBLIC AND PRIVATE NOTICES
        # This avoids the OR query (Q objects) which triggers RecursionError in Djongo
        try:
            # Public/General notices (no user assigned)
            public_notices_query = Notice.objects.filter(user__isnull=True)
            
            # Apply section filtering for students
            if request.user.user_type == 'student':
                exam_section = getattr(request.user, 'exam_section', None)
                from django.db.models import Q
                
                # Filter for: (is_general=True) OR (no specific section) OR (matching student section)
                section_filter = Q(is_general=True) | Q(targeted_section__isnull=True) | Q(targeted_section="")
                if exam_section:
                    section_filter |= Q(targeted_section=exam_section)
                
                public_notices = list(public_notices_query.filter(section_filter))
                print(f"[DEBUG] Found {len(public_notices)} targeted/general notices for section: {exam_section}")
            else:
                public_notices = list(public_notices_query)

            # Private notices (specifically for this user)
            user_notices = list(Notice.objects.filter(user=request.user))
            
            all_notices = public_notices + user_notices
            
            # Sort manually if needed (e.g. by created_at desc)
            # Assuming created_at exists, otherwise skip sort or inspect model
            try:
                all_notices.sort(key=lambda x: x.created_at, reverse=True)
            except AttributeError:
                pass # Model might not have created_at
            
            serializer = self.get_serializer(all_notices, many=True)
            return response.Response(serializer.data)
        except Exception as e:
            # Last resort fallback if manual combo fails
            print(f"Error manually combining notices: {e}")
            return response.Response([])

class UserSearchView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '')
        if len(query) < 2:
            return response.Response([])

        from django.db.models import Q
        users = CustomUser.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query)
        ).exclude(pk=request.user.pk)[:10]

        data = [{
            'id': str(u.pk),
            'username': u.username,
            'name': f"{u.first_name} {u.last_name}".strip() or u.username,
            'user_type': u.user_type
        } for u in users]

        return response.Response(data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def temporary_cleanup_view(request):
    """Temporary admin tool to wipe corrupted %(0 entries"""
    if not request.user.is_staff and request.user.user_type != 'student':
        return response.Response({"error": "Unauthorized"}, status=403)
        
    from .models import Grievance
    count1 = Grievance.objects.filter(student_name__icontains='%').delete()[0]
    count2 = Grievance.objects.filter(student_name='%(0').delete()[0]
    count3 = Grievance.objects.filter(subject__isnull=True).delete()[0]
    count4 = Grievance.objects.filter(subject='').delete()[0]
    
    return response.Response({
        "status": "success",
        "deleted_count": count1 + count2 + count3 + count4,
        "details": {
            "percent_matches": count1,
            "literal_matches": count2,
            "null_subjects": count3,
            "empty_subjects": count4
        }
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def cleanup_duplicate_users_view(request):
    """Admin tool to resolve 'MultipleObjectsReturned' by wiping duplicate usernames"""
    if not request.user.is_staff and not request.user.is_superuser:
         return response.Response({"error": "Unauthorized. Staff only."}, status=403)

    from .models import CustomUser
    from django.db.models import Count
    
    # Simple Python-side lookup to be safe with Djongo
    all_users = list(CustomUser.objects.all())
    from collections import Counter
    counts = Counter([u.username for u in all_users])
    duplicates = [name for name, count in counts.items() if count > 1 and name]
    
    report = []
    total_deleted = 0
    
    for username in duplicates:
        # Keep the most recently updated/created one
        user_list = list(CustomUser.objects.filter(username=username).order_by('-pk')) 
        keep = user_list[0]
        to_delete = user_list[1:]
        
        del_count = 0
        for dupe in to_delete:
            dupe.delete()
            del_count += 1
            total_deleted += 1
            
        report.append({
            "username": username,
            "kept_id": str(keep.pk),
            "deleted_count": del_count
        })
        
    return response.Response({
        "status": "success",
        "total_deleted": total_deleted,
        "duplicates_processed": report
    })
