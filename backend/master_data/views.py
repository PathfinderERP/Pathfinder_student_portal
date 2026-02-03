from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Session, TargetExam, ExamType, ClassLevel, ExamDetail, Subject, Topic, Chapter, SubTopic, Teacher, LibraryItem, SolutionItem, Notice
from .serializers import SessionSerializer, TargetExamSerializer, ExamTypeSerializer, ClassLevelSerializer, ExamDetailSerializer, SubjectSerializer, TopicSerializer, ChapterSerializer, SubTopicSerializer, TeacherSerializer, LibraryItemSerializer, SolutionItemSerializer, NoticeSerializer

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

class ChapterViewSet(viewsets.ModelViewSet):
    queryset = Chapter.objects.all().order_by('-created_at')
    serializer_class = ChapterSerializer

class ExamDetailViewSet(viewsets.ModelViewSet):
    queryset = ExamDetail.objects.all().order_by('-created_at')
    serializer_class = ExamDetailSerializer

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all().order_by('-created_at')
    serializer_class = SubjectSerializer

class TopicViewSet(viewsets.ModelViewSet):
    queryset = Topic.objects.all().order_by('-created_at')
    serializer_class = TopicSerializer

class SubTopicViewSet(viewsets.ModelViewSet):
    queryset = SubTopic.objects.all().order_by('-created_at')
    serializer_class = SubTopicSerializer

class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.all().order_by('-created_at')
    serializer_class = TeacherSerializer

class LibraryItemViewSet(viewsets.ModelViewSet):
    queryset = LibraryItem.objects.select_related(
        'session', 'class_level', 'subject', 'exam_type', 'target_exam'
    ).all().order_by('-created_at')
    serializer_class = LibraryItemSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.AllowAny]

class SolutionItemViewSet(viewsets.ModelViewSet):
    queryset = SolutionItem.objects.select_related(
        'session', 'class_level', 'subject', 'exam_type', 'target_exam'
    ).prefetch_related('sections').all().order_by('-created_at')
    serializer_class = SolutionItemSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.AllowAny]

class NoticeViewSet(viewsets.ModelViewSet):
    queryset = Notice.objects.select_related(
        'session', 'class_level', 'subject', 'exam_type', 'target_exam'
    ).all().order_by('-created_at')
    serializer_class = NoticeSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.AllowAny]
