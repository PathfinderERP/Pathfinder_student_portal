import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from master_data.models import TargetExam
from django.db import connection

print("Deleting all TargetExam records...")
TargetExam.objects.all().delete()
print("Done.")
