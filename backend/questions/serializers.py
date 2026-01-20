from rest_framework import serializers
from .models import Question, QuestionImage

class QuestionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='_id', read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'class_level', 'subject', 'topic', 'exam_type', 'target_exam',
            'question_type', 'difficulty_level', 'content', 'image_1', 'image_2',
            'solution', 'question_options', 'answer_from', 'answer_to',
            'has_calculator', 'use_numeric_options', 'is_wrong', 'created_at', 'updated_at'
        ]

class QuestionImageSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='_id', read_only=True)
    class_level_name = serializers.ReadOnlyField(source='class_level.name')
    subject_name = serializers.ReadOnlyField(source='subject.name')
    topic_name = serializers.ReadOnlyField(source='topic.name')
    exam_type_name = serializers.ReadOnlyField(source='exam_type.name')
    target_exam_name = serializers.ReadOnlyField(source='target_exam.name')

    class Meta:
        model = QuestionImage
        fields = [
            'id', 'image', 'class_level', 'subject', 'topic', 'exam_type', 
            'target_exam', 'class_level_name', 'subject_name', 'topic_name', 
            'exam_type_name', 'target_exam_name', 'created_at'
        ]
