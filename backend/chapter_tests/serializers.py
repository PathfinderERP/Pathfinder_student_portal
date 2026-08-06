from rest_framework import serializers
from .models import ChapterTestResult

class ChapterTestResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    first_name = serializers.CharField(source='student.first_name', read_only=True)
    last_name = serializers.CharField(source='student.last_name', read_only=True)
    admission_number = serializers.CharField(source='student.admission_number', read_only=True)
    centre_name = serializers.CharField(source='student.centre_name', read_only=True)
    class_name = serializers.CharField(source='student.class_level.name', read_only=True)
    email = serializers.CharField(source='student.email', read_only=True)
    target_exam = serializers.CharField(source='student.exam_tag_name', read_only=True)

    class Meta:
        model = ChapterTestResult
        fields = '__all__'
        read_only_fields = ['student', 'created_at']

    def create(self, validated_data):
        # Automatically assign the logged-in user as the student
        validated_data['student'] = self.context['request'].user
        return super().create(validated_data)
