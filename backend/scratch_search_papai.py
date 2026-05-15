import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
name = "PAPAI PAUL"
print(f"Searching for student name: {name}")

# Try searching by first/last name
f_name = "PAPAI"
l_name = "PAUL"
users = User.objects.filter(first_name__iexact=f_name, last_name__iexact=l_name)

if not users:
    print("Not found by name, trying search in username")
    users = User.objects.filter(username__icontains="papai")

for u in users:
    print(f"Found User: {u.username}")
    print(f"ID (pk): {u.pk}")
    print(f"ERP ID: {u.erp_student_id}")
    print(f"Admission Number: {u.admission_number}")
    print(f"Email: {u.email}")
