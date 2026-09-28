from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ChapterTestResult
from .serializers import ChapterTestResultSerializer

class ChapterTestResultViewSet(viewsets.ModelViewSet):
    serializer_class = ChapterTestResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return ChapterTestResult.objects.all()
        # Only return results for the logged-in student
        return ChapterTestResult.objects.filter(student=self.request.user)

    @action(detail=True, methods=['post'], url_path='save_reflections')
    def save_reflections(self, request, pk=None):
        result = self.get_object()
        
        # Check permissions: student can only update their own result
        if not (request.user.is_staff or request.user.is_superuser) and result.student != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        reflections_data = request.data.get('reflections')
        question_id = request.data.get('question_id')
        reflection = request.data.get('reflection')

        current = result.reflections or {}
        if not isinstance(current, dict):
            current = {}

        if isinstance(reflections_data, dict):
            for q_id, r_val in reflections_data.items():
                current[str(q_id)] = r_val
        elif question_id:
            current[str(question_id)] = reflection or ''
        else:
            return Response({'error': 'No reflections provided'}, status=status.HTTP_400_BAD_REQUEST)

        result.reflections = current
        result.save()
        return Response({'status': 'success', 'reflections': result.reflections})

