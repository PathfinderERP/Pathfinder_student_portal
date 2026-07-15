from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UploadedFile, CustomUser, Grievance, StudyTask, Notice, StudentPsychometricProfile, StudentStudyPlannerConfig, Doubt, ClassFeedback
from .models import UserActivityLog
import json

class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    
    permissions = serializers.JSONField(required=False, allow_null=True)

    # Read-only human-readable labels derived from FK relationships
    class_level_name = serializers.SerializerMethodField()
    target_exam_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'user_type', 'profile_image',
            'first_name', 'last_name', 'employee_id', 'permissions',
            'is_active', 'date_joined', 'created_by_username',
            'exam_section', 'study_section', 'omr_code', 'rm_code',
            'admission_number', 'centre_code', 'centre_name',
            'class_level', 'class_level_name',
            'target_exam', 'target_exam_name', 'exam_tag_name',
        ]
        read_only_fields = ['username', 'date_joined', 'created_by_username', 'admission_number']

    def get_class_level_name(self, obj):
        """Return the human-readable class name (e.g. 'Class 9', 'Class 11').
        Checks local FK first, then falls back to cached ERP data."""
        try:
            if obj.class_level:
                return str(obj.class_level)  # Uses ClassLevel.__str__ → name field
        except Exception:
            pass

        # Fallback: read from cached ERP profile (populated at login)
        try:
            from django.core.cache import cache
            cached = cache.get(f"erp_student_data_v6_{obj.pk}") or {}
            # ERP shape: cached['class'] = { 'className': 'Class 11', ... }
            cls_obj = cached.get('class') or {}
            if isinstance(cls_obj, dict):
                cls_name = (cls_obj.get('className') or cls_obj.get('name') or '').strip()
                if cls_name:
                    return cls_name
        except Exception:
            pass

        return None

    def get_target_exam_name(self, obj):
        """Return the target exam name (e.g. 'NEET', 'JEE', 'WBJEE').
        Checks local FK, then exam_tag_name field, then cached ERP course data."""
        try:
            if obj.target_exam:
                return str(obj.target_exam)  # Uses TargetExam.__str__ → name field
        except Exception:
            pass

        # exam_tag_name is a plain-text fallback stored at ERP login
        if obj.exam_tag_name:
            return obj.exam_tag_name

        # Last resort: read from cached ERP course info
        try:
            from django.core.cache import cache
            cached = cache.get(f"erp_student_data_v6_{obj.pk}") or {}
            course_obj = cached.get('course') or {}
            if isinstance(course_obj, dict):
                tag = (course_obj.get('examTagName') or course_obj.get('examTag') or
                       course_obj.get('name') or '').strip()
                if tag:
                    return tag
        except Exception:
            pass

        return None


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
        from rest_framework.exceptions import AuthenticationFailed
        from django.core.cache import cache
        
        # Store the error message from authentication backend
        error_cache_key = f"auth_error_{attrs.get('username', '')}"
        
        try:
            # We must call super().validate first to authenticate the user
            data = super().validate(attrs)
        except AuthenticationFailed as e:
            # Check if there's a specific error message from the backend
            cached_error = cache.get(error_cache_key)
            if cached_error:
                cache.delete(error_cache_key)  # Clean up
                # Raise with the specific error message
                raise AuthenticationFailed(cached_error)
            # Otherwise, raise the original error
            raise
        
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
                log_login_direct(user.pk, username_to_log, ip, user_agent)
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

class GrievanceSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    
    class Meta:
        model = Grievance
        fields = '__all__'
        read_only_fields = ['student_name', 'student_id']

class StudyTaskSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    
    class Meta:
        model = StudyTask
        fields = ['id', 'topic', 'subject', 'date', 'time', 'duration', 'priority', 'completed', 'created_at']
        read_only_fields = ['id', 'created_at']

class NoticeSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    
    class Meta:
        model = Notice
        fields = '__all__'
        read_only_fields = ['id', 'date', 'is_new']

class StudentPsychometricProfileSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    
    class Meta:
        model = StudentPsychometricProfile
        fields = ['id', 'classification', 'traits', 'summary', 'raw_responses', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class StudentStudyPlannerConfigSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    
    class Meta:
        model = StudentStudyPlannerConfig
        fields = ['id', 'target_college', 'updated_at']
        read_only_fields = ['id', 'updated_at']

class UserActivityLogSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    
    class Meta:
        model = UserActivityLog
        fields = ['id', 'activity_type', 'path', 'metadata', 'duration', 'timestamp']
        read_only_fields = ['id', 'timestamp']

class DoubtSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    
    class Meta:
        model = Doubt
        fields = '__all__'
        read_only_fields = ['id', 'student_name', 'student_id', 'created_at']

class ClassFeedbackSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    student_name = serializers.CharField(source='student.first_name', read_only=True)
    student_username = serializers.CharField(source='student.username', read_only=True)
    responses = serializers.JSONField(required=False, allow_null=True)
    teacher_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    teacher_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    subject = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    centre_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    student_batch = serializers.CharField(source='student.assigned_batch', read_only=True)
    student_center = serializers.CharField(source='student.centre_name', read_only=True)
    student_exam_tag = serializers.CharField(source='student.exam_tag_name', read_only=True)

    class Meta:
        model = ClassFeedback
        fields = [
            'id', 'student', 'student_name', 'student_username',
            'student_batch', 'student_center', 'student_exam_tag',
            'teacher_id', 'teacher_name', 'subject', 'date_of_class',
            'responses', 'average_score', 'centre_code', 'created_at'
        ]
        read_only_fields = ['student', 'average_score', 'created_at']
