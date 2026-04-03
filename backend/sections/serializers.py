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
        # Use .all() to take advantage of prefetch_related and avoid N+1 queries
        return list(set(str(q.pk) for q in obj.questions.all()))
