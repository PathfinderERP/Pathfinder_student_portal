from rest_framework import serializers
from .models import ChapterTestResult

class ChapterTestResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    admission_number = serializers.CharField(source='student.admission_number', read_only=True)

    class Meta:
        model = ChapterTestResult
        fields = '__all__'
        read_only_fields = ['student', 'created_at']

    def create(self, validated_data):
        # Automatically assign the logged-in user as the student
        validated_data['student'] = self.context['request'].user
        return super().create(validated_data)
