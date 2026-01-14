from rest_framework import viewsets
from .models import Session, TargetExam, ExamType, ClassLevel, ExamDetail
from .serializers import SessionSerializer, TargetExamSerializer, ExamTypeSerializer, ClassLevelSerializer, ExamDetailSerializer

class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.all().order_by('-created_at')
    serializer_class = SessionSerializer

class TargetExamViewSet(viewsets.ModelViewSet):
    queryset = TargetExam.objects.all().order_by('-created_at')
    serializer_class = TargetExamSerializer

class ExamTypeViewSet(viewsets.ModelViewSet):
    queryset = ExamType.objects.all().order_by('-created_at')
    serializer_class = ExamTypeSerializer

class ClassLevelViewSet(viewsets.ModelViewSet):
    queryset = ClassLevel.objects.all().order_by('-created_at')
    serializer_class = ClassLevelSerializer

class ExamDetailViewSet(viewsets.ModelViewSet):
    queryset = ExamDetail.objects.all().order_by('-created_at')
    serializer_class = ExamDetailSerializer
