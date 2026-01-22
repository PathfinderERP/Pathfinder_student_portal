from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SessionViewSet, TargetExamViewSet, ExamTypeViewSet, ClassLevelViewSet, ExamDetailViewSet, SubjectViewSet, TopicViewSet, ChapterViewSet, SubTopicViewSet

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

urlpatterns = [
    path('', include(router.urls)),
]
