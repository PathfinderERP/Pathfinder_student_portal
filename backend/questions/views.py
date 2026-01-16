from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Question
from .serializers import QuestionSerializer
from datetime import timedelta

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Question.objects.all()
        # Optional: Add filtering here (e.g., by subject, topic)
        subject_id = self.request.query_params.get('subject', None)
        if subject_id:
            queryset = queryset.filter(subject__id=subject_id)
        return queryset.order_by('-created_at')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = Question.objects.count()
        
        # This Month
        now = timezone.now()
        first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        this_month_count = Question.objects.filter(created_at__gte=first_day_of_month).count()
        
        # Last Batch (Last created question time)
        last_question = Question.objects.order_by('-created_at').first()
        if last_question:
            diff = now - last_question.created_at
            if diff.days > 0:
                last_batch = f"{diff.days} days ago"
            elif diff.seconds > 3600:
                last_batch = f"{diff.seconds // 3600} hours ago"
            elif diff.seconds > 60:
                last_batch = f"{diff.seconds // 60} mins ago"
            else:
                last_batch = "Just now"
        else:
            last_batch = "No data"
            
        return Response({
            "total": total,
            "thisMonth": this_month_count,
            "lastBatch": last_batch
        })
