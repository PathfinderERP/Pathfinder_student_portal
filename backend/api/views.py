from rest_framework import viewsets, permissions, generics, status, response
from rest_framework.decorators import action
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
        queryset = Grievance.objects.all()
        category = self.request.query_params.get('category')
        status = self.request.query_params.get('status')
        if category:
            queryset = queryset.filter(category=category)
        if status:
            queryset = queryset.filter(status=status)
        return queryset

    def perform_create(self, serializer):
        # Automatically set student info if they are a student
        extra_data = {}
        if self.request.user.user_type == 'student':
            extra_data['student_name'] = f"{self.request.user.first_name} {self.request.user.last_name}" if self.request.user.first_name else self.request.user.username
            extra_data['student_id'] = str(self.request.user.pk)
            
            # If status not provided, default based on category
            if 'status' not in self.request.data:
                category = self.request.data.get('category', 'Academic')
                if category in ['Academic', 'Doubt Session']:
                    extra_data['status'] = 'Unassigned'
                else:
                    extra_data['status'] = 'Pending'
        
        serializer.save(**extra_data)

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
