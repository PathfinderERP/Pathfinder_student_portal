from rest_framework import viewsets, permissions
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
