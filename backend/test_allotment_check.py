import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test, TestSubmission
from api.models import CustomUser

u = CustomUser.objects.filter(email='fortwilliam1@gmail.com').first()
print(f"Student: {u.username}")
print(f"Student Section: {u.exam_section}")

t = Test.objects.filter(name__icontains='FOUNDATION CLAP TEST 1').first()
print(f"Test: {t.name}")
allotted = [s.name.strip().lower() for s in t.allotted_sections.all()]
print(f"Allotted Sections: {allotted}")

s_exam = (u.exam_section or "").strip().lower()
s_study = (u.study_section or "").strip().lower()

is_allotted = s_exam in allotted or s_study in allotted
print(f"Is allotted via section? {is_allotted}")

sub = TestSubmission.objects.filter(test=t, student=u).first()
print(f"Has submission? {sub is not None}")
