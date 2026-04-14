import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test

test = Test.objects.get(id=45)
print(f"Test: {test.name} (ID: {test.id})")
print(f"Session: {test.session.name if test.session else 'None'}")
print(f"Master Sections: {[s.name for s in test.allotted_sections.all()]}")
