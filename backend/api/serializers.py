from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UploadedFile, CustomUser
import json

class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    
    permissions = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'user_type', 'profile_image', 'first_name', 'last_name', 'permissions', 'is_active', 'date_joined', 'created_by_username']
        read_only_fields = ['username', 'date_joined', 'created_by_username']

    def validate_user_type(self, value):
        request = self.context.get('request')
        if not request or not request.user:
            return value
        
        # Only superadmin can change user roles
        if request.user.user_type != 'superadmin':
            if self.instance and self.instance.user_type != value:
                raise serializers.ValidationError("Only superadmins can change user roles.")
        return value

    def update(self, instance, validated_data):
        permissions_data = validated_data.pop('permissions', None)
        request = self.context.get('request')
        is_superadmin = (request and hasattr(request, 'user') and request.user.user_type == 'superadmin')

        # Handle user_type security (redundant but safe)
        new_user_type = validated_data.get('user_type')
        if new_user_type and instance.user_type != new_user_type:
            if not is_superadmin:
                raise serializers.ValidationError("Only superadmins can change user roles.")

        # Handle permissions explicitly
        if permissions_data is not None:
            if is_superadmin:
                # Ensure it's a dict
                if isinstance(permissions_data, str):
                    try:
                        permissions_data = json.loads(permissions_data)
                    except:
                        pass
                instance.permissions = permissions_data
            else:
                # If not superadmin, we MUST NOT allow changing permissions
                # so we ignore the permissions_data from the request
                pass

        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        instance.save()
        return instance

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Ensure permissions is always a clean dict for the frontend
        perms = ret.get('permissions')
        if isinstance(perms, str):
            try:
                ret['permissions'] = json.loads(perms)
            except:
                ret['permissions'] = {}
        elif perms is None:
            ret['permissions'] = {}
        return ret

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'password', 'user_type', 'first_name', 'last_name', 'permissions']
        extra_kwargs = {
            'username': {'validators': []},  # Disable automatic unique validator to avoid Djongo recursion
        }
    
    def validate_username(self, value):
        # Manual uniqueness check using filter().exists() which is simpler for Djongo
        if CustomUser.objects.filter(username=value).count() > 0:
            raise serializers.ValidationError("A user with that username already exists.")
        return value
        
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
        
        # Set created_by_username from request context (storing email for better identification)
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            user.created_by_username = request.user.email
        
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

    def validate(self, attrs):
        # We must call super().validate first to authenticate the user
        data = super().validate(attrs)
        
        # Log the login session with full context using direct DB access
        try:
            from .db_utils import log_login_direct
            # self.user is set by the parent validate() method
            user = getattr(self, 'user', None)
            request = self.context.get('request')
            
            # Use identifier from attrs as fallback
            identifier = attrs.get('username', 'Unknown')
            
            if user:
                username_to_log = str(user.username) if user.username else str(identifier)
                ip = 'Unknown IP'
                user_agent = 'Unknown Browser'
                
                if request:
                    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                    if x_forwarded_for:
                        ip = str(x_forwarded_for.split(',')[0])
                    else:
                        ip = str(request.META.get('REMOTE_ADDR', 'Unknown IP'))
                    user_agent = str(request.META.get('HTTP_USER_AGENT', 'Unknown Browser'))
                
                print(f"Bypassing ORM: Logging {username_to_log} directly to Mongo")
                log_login_direct(user.id, username_to_log, ip, user_agent)
            else:
                print("CRITICAL LOGIN DEBUG: No user object found after validation")
        except Exception as e:
            print(f"CRITICAL LOGIN ERROR in Direct Access: {str(e)}")
            
        return data

class UploadedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = '__all__'

class LoginLogSerializer(serializers.Serializer):
    id = serializers.CharField()
    username = serializers.CharField()
    ip_address = serializers.CharField()
    status = serializers.CharField()
    time = serializers.CharField()
    user_agent = serializers.CharField()
