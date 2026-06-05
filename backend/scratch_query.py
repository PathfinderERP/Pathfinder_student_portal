import os
import sys

# Setup Django
sys.path.append('a:\\Pathfinder_student_portal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from api.models import CustomUser
from django.db.models import Q

search_email = "pmunmundutta2006@gmail.com"
users = CustomUser.objects.filter(
    Q(username__icontains="pmunmun") | 
    Q(email__icontains="pmunmun") | 
    Q(first_name__icontains="PRIYABRATA") |
    Q(last_name__icontains="DUTTA") |
    Q(admission_number__icontains="3738")
)

print(f"Found {users.count()} users matching the criteria.")
for u in users:
    print(f"---")
    print(f"Username: {u.username}")
    print(f"Email: {u.email}")
    print(f"Admission Number: {u.admission_number}")
    print(f"ERP Student ID: {u.erp_student_id}")
    print(f"Name: {u.first_name} {u.last_name}")
    print(f"OMR Code: {u.omr_code}")
    print(f"RM Code: {u.rm_code}")
