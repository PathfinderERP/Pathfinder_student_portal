from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CentreViewSet

router = DefaultRouter()
router.register(r'', CentreViewSet, basename='centre')

urlpatterns = [
    path('', include(router.urls)),
]
