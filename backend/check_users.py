import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser

# Check users in 'HO EASTERN COMMAND'
# Note: centre_name might be 'HO EASTERN COMMAND GS (EDUCATIONAL)'
users = CustomUser.objects.filter(user_type='student')[:10]
for u in users:
    print(f"User: {u.username} | Name: {u.first_name} {u.last_name} | RM: {u.rm_code} | EMP: {u.employee_id} | OMR: {u.omr_code}")
