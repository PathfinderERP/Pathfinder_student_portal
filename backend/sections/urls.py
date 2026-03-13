from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SectionViewSet
from .section_detail_views import (
    list_master_sections,
    section_stats,
)

router = DefaultRouter()
router.register(r'', SectionViewSet)

urlpatterns = [
    # Custom endpoints first
    path('master/', list_master_sections, name='section-master-list'),
    path('stats/', section_stats, name='section-stats'),
    
    # Root paths for GET should use list_master_sections
    path('', list_master_sections, name='section-list'),
    
    # Include router for POST, PATCH, DELETE and other actions
    path('', include(router.urls)),
]
