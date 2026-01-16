from rest_framework import viewsets, permissions
from .models import Centre
from .serializers import CentreSerializer
from bson import ObjectId

class CentreViewSet(viewsets.ModelViewSet):
    queryset = Centre.objects.all()
    serializer_class = CentreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        pk = self.kwargs.get('pk')
        try:
            return Centre.objects.get(pk=ObjectId(pk))
        except (Centre.DoesNotExist, Exception):
            from django.shortcuts import get_object_or_404
            return get_object_or_404(Centre, pk=pk)
