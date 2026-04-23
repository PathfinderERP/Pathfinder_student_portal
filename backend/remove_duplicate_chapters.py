import os
import sys
import django

sys.path.append(r"A:\Pathfinder_student_portal\backend")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from master_data.models import Chapter

# Fetch all chapters, ordering by ID to keep the first inserted one
chapters = Chapter.objects.all().order_by('id')

seen = set()
duplicates = []

for chapter in chapters:
    # Normalize name to avoid case sensitivity issues
    name = chapter.name.strip().lower() if chapter.name else ''
    class_id = chapter.class_level_id
    subject_id = chapter.subject_id
    
    identifier = (name, class_id, subject_id)
    
    if identifier in seen:
        duplicates.append(chapter)
    else:
        seen.add(identifier)

if duplicates:
    print(f"Found {len(duplicates)} duplicate chapters. Deleting...")
    for duplicate in duplicates:
        print(f"Deleting duplicate chapter: {duplicate.name} (Class ID: {duplicate.class_level_id}, Subject ID: {duplicate.subject_id})")
        duplicate.delete()
    print("Done removing duplicates.")
else:
    print("No duplicate chapters found.")
