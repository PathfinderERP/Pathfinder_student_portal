from rest_framework import viewsets, permissions, generics, status, response
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import UploadedFile, CustomUser, LoginLog, Grievance
from .serializers import (
    UploadedFileSerializer, CustomTokenObtainPairSerializer, 
    UserSerializer, UserCreateSerializer, LoginLogSerializer,
    GrievanceSerializer
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

