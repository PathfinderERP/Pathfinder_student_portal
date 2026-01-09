from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UploadedFile, CustomUser

class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'user_type', 'profile_image', 'first_name', 'last_name', 'permissions', 'is_active']
        read_only_fields = ['username', 'user_type']

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'password', 'user_type', 'first_name', 'last_name', 'permissions']
        
    def create(self, validated_data):
        password = validated_data.pop('password')
        permissions_data = validated_data.pop('permissions', {})
        
        # Use create_user to handle standard Django User setup
        user = CustomUser.objects.create_user(
            username=validated_data.pop('username'),
            email=validated_data.pop('email', ''),
            password=password,
            **validated_data
        )
        
        # Set permissions separately to ensure they are handled correctly
        user.permissions = permissions_data
        user.save()
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['username'] = user.username
        token['user_type'] = getattr(user, 'user_type', 'student')
        token['profile_image'] = user.profile_image.url if user.profile_image else None
        return token

class UploadedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = '__all__'
