from rest_framework import serializers
from .models import Test, TestCentreAllotment
from master_data.serializers import SessionSerializer, ExamTypeSerializer, ClassLevelSerializer, TargetExamSerializer
from sections.models import Section
from centres.models import Centre
from centres.serializers import CentreSerializer
from packages.models import Package
from bson import ObjectId

class ObjectIdRelatedField(serializers.PrimaryKeyRelatedField):
    def to_internal_value(self, data):
        try:
            return self.queryset.get(pk=ObjectId(data))
        except (TypeError, ValueError):
            self.fail('incorrect_type', data_type=type(data).__name__)
        except self.queryset.model.DoesNotExist:
            self.fail('does_not_exist', pk_value=data)

    def to_representation(self, value):
        return str(value.pk)

class TestCentreAllotmentSerializer(serializers.ModelSerializer):
    centre_details = CentreSerializer(source='centre', read_only=True)
    test_name = serializers.ReadOnlyField(source='test.name')
    # Explicitly handle ObjectId fields
    id = serializers.SerializerMethodField()
    test = serializers.SerializerMethodField()
    centre = serializers.SerializerMethodField()

    class Meta:
        model = TestCentreAllotment
        fields = ['id', 'test', 'centre', 'test_name', 'centre_details', 'start_time', 'end_time', 'is_active', 'access_code', 'is_code_sent', 'code_history', 'created_at', 'updated_at']
    
    def get_id(self, obj):
        return obj.id
    
    def get_test(self, obj):
        return str(obj.test.pk) if obj.test else None
    
    def get_centre(self, obj):
        return str(obj.centre.pk) if obj.centre else None


class TestSerializer(serializers.ModelSerializer):
    # For GET requests, we might want nested details
    session_details = SessionSerializer(source='session', read_only=True)
    target_exam_details = TargetExamSerializer(source='target_exam', read_only=True)
    exam_type_details = ExamTypeSerializer(source='exam_type', read_only=True)
    class_level_details = ClassLevelSerializer(source='class_level', read_only=True)
    package_name = serializers.ReadOnlyField(source='package.name')
    
    # Explicitly define allotted_sections to handle M2M with ObjectId pk
    allotted_sections = ObjectIdRelatedField(
        queryset=Section.objects.all(),
        many=True,
        required=False
    )
    
    # Explicitly define centres to handle M2M with ObjectId pk
    centres = ObjectIdRelatedField(
        queryset=Centre.objects.all(),
        many=True,
        required=False
    )

    package = ObjectIdRelatedField(
        queryset=Package.objects.all(),
        required=False,
        allow_null=True
    )
    
    # We can add a method to get count of allotted centres or details
    centres_count = serializers.SerializerMethodField()
    codes_sent_count = serializers.SerializerMethodField()
    sections_count = serializers.SerializerMethodField()
    allotted_master_count = serializers.SerializerMethodField()
    
    # Per-user schedule fields
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = [
            'id', 'name', 'code', 'session', 'session_details', 'target_exam', 'target_exam_details',
            'exam_type', 'exam_type_details', 'package', 'package_name', 'class_level', 'class_level_details',
            'centres', 'centres_count', 'codes_sent_count', 'allotted_sections', 'sections_count', 
            'allotted_master_count', 'duration', 'total_marks', 'description', 'instructions', 
            'is_completed', 'has_calculator', 'option_type_numeric', 'created_at', 'updated_at',
            'start_time', 'end_time'
        ]
        
    def _get_user_allotment(self, obj):
        request = self.context.get('request')
        if not request or not request.user or request.user.is_anonymous:
            return None
        
        user = request.user
        if getattr(user, 'user_type', None) != 'student':
            return None
            
        centre_code = getattr(user, 'centre_code', None)
        if not centre_code:
            return None
            
        # Return the allotment for this student's centre
        return obj.centre_allotments.filter(centre__code=centre_code).first()

    def get_start_time(self, obj):
        allotment = self._get_user_allotment(obj)
        return allotment.start_time if allotment else None

    def get_end_time(self, obj):
        allotment = self._get_user_allotment(obj)
        return allotment.end_time if allotment else None
        
    def get_centres_count(self, obj):
        # Use python len() to leverage prefetch_related and avoid DB hit
        return len(obj.centre_allotments.all())
        
    def get_codes_sent_count(self, obj):
        # Use python generator to leverage prefetch_related and avoid DB hit
        return sum(1 for a in obj.centre_allotments.all() if a.is_code_sent)

    def get_sections_count(self, obj):
        # Total = Owned + Allotted
        owned = len(obj.sections.all())
        allotted = len(obj.allotted_sections.all())
        return owned + allotted

    def get_allotted_master_count(self, obj):
        # Only count sections from Master Registry (where test is null)
        return sum(1 for s in obj.allotted_sections.all() if s.test_id is None)
