import os
import sys
import django

sys.path.append(r"A:\Pathfinder_student_portal\backend")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from master_data.models import ClassLevel
for c in ClassLevel.objects.all():
    print(f"ID: {c.id}, Name: '{c.name}'")
