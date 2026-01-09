from rest_framework import viewsets, permissions, generics, status, response
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import UploadedFile, CustomUser
from .serializers import UploadedFileSerializer, CustomTokenObtainPairSerializer, UserSerializer, UserCreateSerializer

class IsSuperAdmin(permissions.BasePermission):
    """
    Custom permission to only allow superadmins to create users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and getattr(request.user, 'user_type', None) == 'superadmin'

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

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
