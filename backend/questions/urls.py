from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuestionViewSet, QuestionImageViewSet, ExtractAIView

router = DefaultRouter()
router.register(r'images', QuestionImageViewSet)
router.register(r'', QuestionViewSet)

urlpatterns = [
    path('extract-ai/', ExtractAIView.as_view(), name='extract-ai'),
    path('', include(router.urls)),
]
