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
        fields = ['id', 'test', 'centre', 'test_name', 'centre_details', 'start_time', 'end_time', 'is_active', 'access_code', 'code_history', 'created_at', 'updated_at']
    
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

    class Meta:
        model = Test
        fields = '__all__'
        
    def get_centres_count(self, obj):
        return obj.centres.count()
