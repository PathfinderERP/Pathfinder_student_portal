import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.filter(first_name__icontains="Ambarish").first()
if u:
    print(f"Name: {u.first_name} {u.last_name} | ID: {u.username} | Admission: {getattr(u, 'admission_number', 'N/A')}")
else:
    print("Not found.")
