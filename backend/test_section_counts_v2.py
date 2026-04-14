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
    admin = CustomUser.objects.filter(is_superuser=True).first()
    if not admin:
        print("No admin user found")
        return
        
    request = factory.get('/api/sections/master/')
    request.user = admin
    
    # Simulate the @api_view behavior
    from rest_framework.decorators import api_view, permission_classes
    from rest_framework.permissions import AllowAny
    
    # We can just call it directly because rest_framework converts it
    response = list_master_sections(request)
    data = response.data
    
    print(f"Total sections in response: {len(data.get('sections', []))}")
    for section in data.get('sections', []):
        print(f"Section: '{section['name']}'")
        print(f"  ID: {section['id']}")
        print(f"  Study Materials: {len(section['study_material_centres'])}")
        print(f"  Online Tests: {len(section['online_exam_centres'])}")

if __name__ == "__main__":
    test()
