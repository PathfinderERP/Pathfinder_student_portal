from django.urls import path
from .section_detail_views import (
    list_master_sections,
)

urlpatterns = [
    # Allow both /api/sections/ and /api/sections/master/ to work
    path('', list_master_sections, name='section-list'),
    path('master/', list_master_sections, name='section-master-list'),
]
