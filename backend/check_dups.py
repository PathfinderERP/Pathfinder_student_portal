import os
import sys

sys.path.append('a:\\Pathfinder_student_portal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from api.models import CustomUser

# Find users with username 'aritrikmata@gmail.com'
users = CustomUser.objects.filter(username='aritrikmata@gmail.com')
print(f"Found {users.count()} users with username 'aritrikmata@gmail.com':")
for u in users:
    print(f"- ID: {u._id}, Username: {u.username}, Admission: {u.admission_number}, Email: {u.email}")
