import os
import sys
import django

sys.path.append(r"A:\Pathfinder_student_portal\backend")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from master_data.models import Topic

topics = Topic.objects.all().order_by('id')
seen = set()
duplicates = []

for topic in topics:
    name = topic.name.strip().lower() if topic.name else ''
    chapter_id = topic.chapter_id
    class_id = topic.class_level_id
    subject_id = topic.subject_id
    
    identifier = (name, chapter_id, class_id, subject_id)
    
    if identifier in seen:
        duplicates.append(topic)
    else:
        seen.add(identifier)

if duplicates:
    print(f"Found {len(duplicates)} duplicate topics. Deleting...")
    for d in duplicates:
        print(f"Deleting duplicate topic: {d.name} (Class ID: {d.class_level_id})")
        d.delete()
    print("Done removing duplicates.")
else:
    print("No duplicate topics found.")
