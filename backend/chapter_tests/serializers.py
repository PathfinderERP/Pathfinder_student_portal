from rest_framework import serializers
from .models import ChapterTestResult

class ChapterTestResultSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    first_name = serializers.CharField(source='student.first_name', read_only=True)
    last_name = serializers.CharField(source='student.last_name', read_only=True)
    username = serializers.CharField(source='student.username', read_only=True)
    admission_number = serializers.CharField(source='student.admission_number', read_only=True)
    centre_name = serializers.CharField(source='student.centre_name', read_only=True)
    class_name = serializers.CharField(source='student.class_level.name', read_only=True)
    email = serializers.CharField(source='student.email', read_only=True)
    target_exam = serializers.CharField(source='student.exam_tag_name', read_only=True)

    def get_full_name(self, obj):
        if obj.student:
            fn = (obj.student.first_name or '').strip()
            ln = (obj.student.last_name or '').strip()
            full = f"{fn} {ln}".strip()
            if full:
                return full
            if obj.student.username:
                return obj.student.username.split('@')[0].replace('.', ' ').title()
        return "Student"

    def get_student_name(self, obj):
        return self.get_full_name(obj)

    class Meta:
        model = ChapterTestResult
        fields = '__all__'
        read_only_fields = ['student', 'created_at']

    def create(self, validated_data):
        # Automatically assign the logged-in user as the student
        validated_data['student'] = self.context['request'].user
        return super().create(validated_data)
