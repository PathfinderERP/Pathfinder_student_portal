from rest_framework import viewsets
from .models import Session, ExamType, ClassLevel
from .serializers import SessionSerializer, ExamTypeSerializer, ClassLevelSerializer

class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.all()
    serializer_class = SessionSerializer

class ExamTypeViewSet(viewsets.ModelViewSet):
    queryset = ExamType.objects.all()
    serializer_class = ExamTypeSerializer

class ClassLevelViewSet(viewsets.ModelViewSet):
    queryset = ClassLevel.objects.all()
    serializer_class = ClassLevelSerializer
