from rest_framework import serializers
from .models import Question, QuestionImage

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'

class QuestionImageSerializer(serializers.ModelSerializer):
    class_level_name = serializers.ReadOnlyField(source='class_level.name')
    subject_name = serializers.ReadOnlyField(source='subject.name')
    topic_name = serializers.ReadOnlyField(source='topic.name')
    exam_type_name = serializers.ReadOnlyField(source='exam_type.name')
    target_exam_name = serializers.ReadOnlyField(source='target_exam.name')

    class Meta:
        model = QuestionImage
        fields = '__all__'
