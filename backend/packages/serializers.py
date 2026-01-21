from rest_framework import serializers
from .models import Package
from master_data.serializers import TargetExamSerializer, SessionSerializer

class PackageSerializer(serializers.ModelSerializer):
    exam_type_details = TargetExamSerializer(source='exam_type', read_only=True)
    session_details = SessionSerializer(source='session', read_only=True)

    class Meta:
        model = Package
        fields = '__all__'
