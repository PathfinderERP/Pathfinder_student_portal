from rest_framework import serializers
from .models import Section

class SectionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='_id', read_only=True)

    class Meta:
        model = Section
        fields = [
            'id', 'test', 'name', 'subject_code', 
            'total_questions', 'allowed_questions', 'shuffle',
            'correct_marks', 'negative_marks', 
            'partial_type', 'partial_marks', 'priority',
            'created_at', 'updated_at'
        ]
