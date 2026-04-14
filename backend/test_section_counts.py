import os
import django
import json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from sections.section_detail_views import list_master_sections
from rest_framework.test import APIRequestFactory
from api.models import CustomUser

def test():
    factory = APIRequestFactory()
    # Create an admin user request
    admin = CustomUser.objects.filter(is_staff=True).first()
    request = factory.get('/api/sections/master/')
    request.user = admin
    
    # We need a real request object for the view
    from rest_framework.request import Request
    drf_request = Request(request)
    
    response = list_master_sections(drf_request)
    data = response.data
    
    for section in data.get('sections', []):
        if section['name'] == 'STUDY MATERIAL':
            print(f"Section: {section['name']}")
            print(f"  Study Materials Count: {len(section['study_material_centres'])}")
            print(f"  Online Tests Count: {len(section['online_exam_centres'])}")

if __name__ == "__main__":
    test()
