from rest_framework import serializers
from .models import Session, TargetExam, ExamType, ClassLevel, ExamDetail, Subject, Topic, Chapter, SubTopic

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

class ChapterSerializer(serializers.ModelSerializer):
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    order = serializers.IntegerField(source='sort_order', required=False)

    class Meta:
        model = Chapter
        fields = ['id', 'class_level', 'subject', 'name', 'code', 'order', 'is_active', 'created_at', 'updated_at', 'class_level_name', 'subject_name']

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

class TopicSerializer(serializers.ModelSerializer):
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    chapter_name = serializers.CharField(source='chapter.name', read_only=True)

    order = serializers.IntegerField(source='sort_order', required=False)

    class Meta:
        model = Topic
        fields = ['id', 'chapter', 'class_level', 'subject', 'name', 'code', 'order', 'is_active', 'created_at', 'updated_at', 'chapter_name', 'class_level_name', 'subject_name']

class SubTopicSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source='topic.name', read_only=True)

    order = serializers.IntegerField(source='sort_order', required=False)

    class Meta:
        model = SubTopic
        fields = ['id', 'topic', 'name', 'code', 'order', 'is_active', 'created_at', 'updated_at', 'topic_name']
