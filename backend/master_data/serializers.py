from rest_framework import serializers
from .models import Session, TargetExam, ExamType, ClassLevel, ExamDetail, Subject

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = '__all__'

class TargetExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = TargetExam
        fields = '__all__'

class ExamTypeSerializer(serializers.ModelSerializer):
    target_exam_name = serializers.CharField(source='target_exam.name', read_only=True)
    class Meta:
        model = ExamType
        fields = '__all__'

class ClassLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassLevel
        fields = '__all__'

class ExamDetailSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source='session.name', read_only=True)
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    target_exam_name = serializers.CharField(source='target_exam.name', read_only=True)

    class Meta:
        model = ExamDetail
        fields = '__all__'

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'
