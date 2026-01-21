from rest_framework import serializers
from .models import Package
from master_data.serializers import TargetExamSerializer, SessionSerializer
from sections.models import Section
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

class PackageSerializer(serializers.ModelSerializer):
    exam_type_details = TargetExamSerializer(source='exam_type', read_only=True)
    session_details = SessionSerializer(source='session', read_only=True)
    
    allotted_sections = ObjectIdRelatedField(
        queryset=Section.objects.all(),
        many=True,
        required=False
    )
    
    allotted_sections_details = serializers.SerializerMethodField()

    class Meta:
        model = Package
        fields = '__all__'

    def get_allotted_sections_details(self, obj):
        return [{"id": str(s.pk), "name": s.name, "code": s.subject_code} for s in obj.allotted_sections.all()]

