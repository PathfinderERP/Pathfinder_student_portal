from rest_framework import viewsets, permissions
from .models import Section
from .serializers import SectionSerializer

class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    # Adjust permissions as needed, e.g. AllowAny for testing or IsAuthenticated
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Additional logic during creation if needed
        serializer.save()
