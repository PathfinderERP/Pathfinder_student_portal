from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuestionViewSet, QuestionImageViewSet

router = DefaultRouter()
router.register(r'images', QuestionImageViewSet)
router.register(r'', QuestionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
