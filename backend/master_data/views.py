from rest_framework import viewsets, permissions, response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Session, TargetExam, ExamType, ClassLevel, ExamDetail, Subject, Topic, Chapter, SubTopic, Teacher, LibraryItem, SolutionItem, Notice, LiveClass, Video, PenPaperTest, Homework, Banner, Seminar, Guide, Community
from .serializers import SessionSerializer, TargetExamSerializer, ExamTypeSerializer, ClassLevelSerializer, ExamDetailSerializer, SubjectSerializer, TopicSerializer, ChapterSerializer, SubTopicSerializer, TeacherSerializer, LibraryItemSerializer, SolutionItemSerializer, NoticeSerializer, LiveClassSerializer, VideoSerializer, PenPaperTestSerializer, HomeworkSerializer, BannerSerializer, SeminarSerializer, GuideSerializer, CommunitySerializer
from django.db.models import Q
from django.core.cache import cache

class StudentSectionFilterMixin:
    """
    Mixin to filter querysets based on student's ERP section.
    """
    def filter_by_section(self, queryset, section_field='section'):
        user = self.request.user
        # Staff/Admin see everything
        if user.is_staff or user.is_superuser or getattr(user, 'user_type', None) != 'student':
            return queryset
            
        exam_section = getattr(user, 'exam_section', None)
        study_section = getattr(user, 'study_section', None)
        
        # Filter by section name matching student's exam_section OR study_section OR null (general)
        filter_q = Q(**{f"{section_field}__isnull": True})
        
        if exam_section:
            filter_q |= Q(**{f"{section_field}__name": exam_section})
            
        if study_section:
            filter_q |= Q(**{f"{section_field}__name": study_section})

        # Check if the model has 'is_general' field
        if hasattr(queryset.model, 'is_general'):
            filter_q |= Q(is_general=True)
            
        return queryset.filter(filter_q)

class CachedListViewSetMixin(object):
    """Mixin to cache the list response for master data and invalidate on change."""
    def get_cache_key(self):
        user = self.request.user
        base_key = f"master_data_{self.__class__.__name__}_list"
        
        # If this viewset uses StudentSectionFilterMixin, we must include the section in the cache key
        if isinstance(self, StudentSectionFilterMixin) and user.is_authenticated:
            exam_section = getattr(user, 'exam_section', 'none')
            study_section = getattr(user, 'study_section', 'none')
            # Create a unique key based on the student's context
            return f"{base_key}_E{exam_section}_S{study_section}"
            
        return base_key

    def list(self, request, *args, **kwargs):
        cache_key = self.get_cache_key()
        cached_data = cache.get(cache_key)
        
        if cached_data is not None and isinstance(cached_data, (list, dict)):
            return response.Response(cached_data)
        
        res = super(CachedListViewSetMixin, self).list(request, *args, **kwargs)
        # Cache master data for 30 minutes, student content for 5 minutes
        timeout = 1800 if not isinstance(self, StudentSectionFilterMixin) else 300
        cache.set(cache_key, res.data, timeout=timeout)
        return res

    def perform_create(self, serializer):
        super(CachedListViewSetMixin, self).perform_create(serializer)
        cache.delete(self.get_cache_key())

    def perform_update(self, serializer):
        super(CachedListViewSetMixin, self).perform_update(serializer)
        cache.delete(self.get_cache_key())

    def perform_destroy(self, instance):
        super(CachedListViewSetMixin, self).perform_destroy(instance)
        cache.delete(self.get_cache_key())

class SessionViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = Session.objects.all().order_by('-created_at')
    serializer_class = SessionSerializer

class TargetExamViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = TargetExam.objects.all().order_by('-created_at')
    serializer_class = TargetExamSerializer

class ExamTypeViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = ExamType.objects.prefetch_related('target_exams').all().order_by('-created_at')
    serializer_class = ExamTypeSerializer

class ClassLevelViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = ClassLevel.objects.all().order_by('-created_at')
    serializer_class = ClassLevelSerializer

class ChapterViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = Chapter.objects.select_related('class_level', 'subject').all().order_by('-created_at')
    serializer_class = ChapterSerializer

class ExamDetailViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = ExamDetail.objects.select_related('session', 'target_exam', 'exam_type', 'class_level').all().order_by('-created_at')
    serializer_class = ExamDetailSerializer

class SubjectViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = Subject.objects.all().order_by('-created_at')
    serializer_class = SubjectSerializer

class TopicViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer

    def get_queryset(self):
        queryset = Topic.objects.select_related('chapter', 'class_level', 'subject').all().order_by('-created_at')
        chapter_id = self.request.query_params.get('chapter', None)
        if chapter_id:
            queryset = queryset.filter(chapter_id=chapter_id)
        return queryset

    def list(self, request, *args, **kwargs):
        # Only use cache when fetching ALL topics (no filter applied)
        if request.query_params.get('chapter'):
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return response.Response(serializer.data)
        return super().list(request, *args, **kwargs)

class SubTopicViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = SubTopic.objects.all()
    serializer_class = SubTopicSerializer

    def get_queryset(self):
        queryset = SubTopic.objects.select_related('topic').all().order_by('-created_at')
        topic_id = self.request.query_params.get('topic', None)
        chapter_id = self.request.query_params.get('chapter', None)
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)
        elif chapter_id:
            queryset = queryset.filter(topic__chapter_id=chapter_id)
        return queryset

    def list(self, request, *args, **kwargs):
        # Only use cache when fetching ALL subtopics (no filter applied)
        if request.query_params.get('topic') or request.query_params.get('chapter'):
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return response.Response(serializer.data)
        return super().list(request, *args, **kwargs)

class TeacherViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = Teacher.objects.select_related('subject').all().order_by('-created_at')
    serializer_class = TeacherSerializer

class LibraryItemViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = LibraryItem.objects.all()
    serializer_class = LibraryItemSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = LibraryItem.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam', 'section'
        ).all().order_by('-created_at')
        return self.filter_by_section(queryset, 'section')

class SolutionItemViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = SolutionItem.objects.all()
    serializer_class = SolutionItemSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = SolutionItem.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam'
        ).prefetch_related('sections').all().order_by('-created_at')
        return self.filter_by_section(queryset, 'sections')

class NoticeViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = Notice.objects.all()
    serializer_class = NoticeSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Notice.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam'
        ).all().order_by('-created_at')
        return self.filter_by_section(queryset, 'section')

class LiveClassViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = LiveClass.objects.all()
    serializer_class = LiveClassSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = LiveClass.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam'
        ).prefetch_related('packages').all().order_by('-created_at')
        return self.filter_by_section(queryset, 'section')

class VideoViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Video.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam'
        ).prefetch_related('packages').all().order_by('-created_at')
        return self.filter_by_section(queryset, 'section')

class PenPaperTestViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = PenPaperTest.objects.all()
    serializer_class = PenPaperTestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = PenPaperTest.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam'
        ).prefetch_related('packages', 'sections').all().order_by('-created_at')
        return self.filter_by_section(queryset, 'sections')

class HomeworkViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = Homework.objects.all()
    serializer_class = HomeworkSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Homework.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam'
        ).prefetch_related('sections').all().order_by('-created_at')
        return self.filter_by_section(queryset, 'sections')

class BannerViewSet(viewsets.ModelViewSet):
    queryset = Banner.objects.all().order_by('-created_at')
    serializer_class = BannerSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.AllowAny]

class SeminarViewSet(viewsets.ModelViewSet):
    queryset = Seminar.objects.all().order_by('-date_time')
    serializer_class = SeminarSerializer
    permission_classes = [permissions.AllowAny]

class GuideViewSet(viewsets.ModelViewSet):
    queryset = Guide.objects.all().order_by('-created_at')
    serializer_class = GuideSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.AllowAny]

class CommunityViewSet(viewsets.ModelViewSet):
    queryset = Community.objects.all().order_by('-created_at')
    serializer_class = CommunitySerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.AllowAny]
