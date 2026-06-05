import os
import sys

sys.path.append('a:\\Pathfinder_student_portal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from api.models import CustomUser

users = CustomUser.objects.filter(email="pmunmundutta2006@gmail.com")
print("By email:", users.count())
for u in users:
    print(u.username, u.first_name, u.admission_number, u.erp_student_id)

users = CustomUser.objects.filter(username="pmunmundutta2006@gmail.com")
print("By username:", users.count())
for u in users:
    print(u.username, u.first_name, u.admission_number, u.erp_student_id)

users = CustomUser.objects.filter(first_name__icontains="Priyabrata")
print("By first_name:", users.count())
for u in users:
    print(u.username, u.first_name, u.admission_number, u.erp_student_id)
