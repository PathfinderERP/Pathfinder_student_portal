from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SessionViewSet, ExamTypeViewSet, ClassLevelViewSet

router = DefaultRouter()
router.register(r'sessions', SessionViewSet)
router.register(r'exam-types', ExamTypeViewSet)
router.register(r'classes', ClassLevelViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
