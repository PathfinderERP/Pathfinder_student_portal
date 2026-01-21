from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TestViewSet, TestCentreAllotmentViewSet

router = DefaultRouter()
router.register(r'allotments', TestCentreAllotmentViewSet)
router.register(r'', TestViewSet, basename='test')

urlpatterns = [
    path('', include(router.urls)),
]
