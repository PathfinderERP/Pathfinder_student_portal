import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test

print("Listing all tests and their is_completed status:")
for t in Test.objects.all():
    print(f"ID: {t.id}, Name: {t.name}, Code: {t.code}, Is Completed: {t.is_completed}")
