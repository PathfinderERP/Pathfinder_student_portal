import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

# Search for any user matching Kriteen
users = User.objects.filter(first_name__icontains='KRITEEN')
for u in users:
    print(f"Local User: {u.first_name} {u.last_name}")
    print(f"Username: {u.username}")
    print(f"Admission: {u.admission_number}")
    print(f"Exam Section: {u.exam_section}")
    print(f"Centre: {u.centre_name} ({u.centre_code})")
    print("------------------------------------------")
