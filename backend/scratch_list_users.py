import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
print("Listing first 5 users:")
for u in User.objects.all()[:5]:
    print(f"ID: {u.pk} | Username: {u.username} | ERP ID: {u.erp_student_id}")
