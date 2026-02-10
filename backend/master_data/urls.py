from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SessionViewSet, TargetExamViewSet, ExamTypeViewSet, ClassLevelViewSet, ExamDetailViewSet, SubjectViewSet, TopicViewSet, ChapterViewSet, SubTopicViewSet, TeacherViewSet, LibraryItemViewSet, SolutionItemViewSet, NoticeViewSet, LiveClassViewSet, VideoViewSet, PenPaperTestViewSet, HomeworkViewSet, BannerViewSet, SeminarViewSet, GuideViewSet, CommunityViewSet

router = DefaultRouter()
router.register(r'sessions', SessionViewSet)
router.register(r'target-exams', TargetExamViewSet)
router.register(r'exam-types', ExamTypeViewSet)
router.register(r'classes', ClassLevelViewSet)
router.register(r'chapters', ChapterViewSet)
router.register(r'exam-details', ExamDetailViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'topics', TopicViewSet)
router.register(r'subtopics', SubTopicViewSet)
router.register(r'teachers', TeacherViewSet)
router.register(r'library', LibraryItemViewSet)
router.register(r'solutions', SolutionItemViewSet)
router.register(r'notices', NoticeViewSet)
router.register(r'live-classes', LiveClassViewSet)
router.register(r'videos', VideoViewSet)
router.register(r'pen-paper-tests', PenPaperTestViewSet)
router.register(r'homework', HomeworkViewSet)
router.register(r'banners', BannerViewSet)
router.register(r'seminars', SeminarViewSet)
router.register(r'guides', GuideViewSet)
router.register(r'communities', CommunityViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
