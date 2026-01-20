from rest_framework import serializers
from .models import Section

class SectionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='_id', read_only=True)
    questions = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = [
            'id', 'test', 'name', 'subject_code', 
            'total_questions', 'allowed_questions', 'shuffle',
            'correct_marks', 'negative_marks', 
            'partial_type', 'partial_marks', 'priority',
            'questions', 'created_at', 'updated_at'
        ]

    def get_questions(self, obj):
        # Convert ManyToMany ObjectId references to strings for JSON compatibility
        return [str(q_id) for q_id in obj.questions.values_list('_id', flat=True)]
