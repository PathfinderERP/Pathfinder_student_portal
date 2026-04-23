import os
import sys
import django

sys.path.append(r"A:\Pathfinder_student_portal\backend")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from master_data.models import Chapter, ClassLevel
from django.db.models import Count

classes = ClassLevel.objects.annotate(chapter_count=Count('chapters'))
for c in classes:
    print(f"{c.name} (ID: {c.id}): {c.chapter_count} chapters")
