from rest_framework import viewsets, permissions
from .models import Centre
from .serializers import CentreSerializer

class CentreViewSet(viewsets.ModelViewSet):
    queryset = Centre.objects.all()
    serializer_class = CentreSerializer
    permission_classes = [permissions.IsAuthenticated]
