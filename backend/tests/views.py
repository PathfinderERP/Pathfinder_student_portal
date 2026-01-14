from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Test
from .serializers import TestSerializer
from sections.models import Section
from sections.serializers import SectionSerializer

class TestViewSet(viewsets.ModelViewSet):
    queryset = Test.objects.all().order_by('-created_at')
    serializer_class = TestSerializer

    @action(detail=True, methods=['get'])
    def sections(self, request, pk=None):
        test = self.get_object()
        sections = test.sections.all()
        serializer = SectionSerializer(sections, many=True)
        return Response(serializer.data)
