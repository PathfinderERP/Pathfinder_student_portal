import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser
from django.contrib.auth import get_user_model

User = get_user_model()
sid = "6A057468D23CA10F7BDDE0AF"
sid_norm = sid.lower().strip()

print(f"Searching for ID: {sid_norm}")
user = User.objects.filter(pk=sid_norm).first()

if not user:
    print("Not found by PK, trying erp_student_id")
    user = User.objects.filter(erp_student_id=sid).first()

if not user:
    print("Not found by erp_student_id, trying admission_number")
    user = User.objects.filter(admission_number=sid).first()

if user:
    print(f"Found User: {user.username}")
    print(f"Email: '{user.email}'")
    print(f"Admission Number: '{user.admission_number}'")
    print(f"Exam Section: '{user.exam_section}'")
    print(f"Study Section: '{user.study_section}'")
    print(f"Class Level: {user.class_level}")
    print(f"Target Exam: {user.target_exam}")
else:
    print("User NOT found in database.")
