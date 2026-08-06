from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChapterTestResultViewSet

router = DefaultRouter()
router.register(r'results', ChapterTestResultViewSet, basename='chapter-test-results')

urlpatterns = [
    path('', include(router.urls)),
]
