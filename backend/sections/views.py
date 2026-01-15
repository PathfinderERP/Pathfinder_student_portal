from rest_framework import viewsets, permissions
from .models import Section
from .serializers import SectionSerializer

class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    # Adjust permissions as needed, e.g. AllowAny for testing or IsAuthenticated
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """
        Override get_object to handle MongoDB ObjectId lookups properly with Djongo.
        The default lookup by pk doesn't always automatically convert hex strings to ObjectIds.
        """
        from bson import ObjectId
        pk = self.kwargs.get('pk')
        try:
            if isinstance(pk, str) and len(pk) == 24:
                return Section.objects.get(_id=ObjectId(pk))
        except Exception:
            pass
        return super().get_object()

    def perform_create(self, serializer):
        # Additional logic during creation if needed
        serializer.save()
