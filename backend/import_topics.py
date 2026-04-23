import os
import sys
import csv
import django

# Set up Django environment
sys.path.append(r"A:\Pathfinder_student_portal\backend")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from master_data.models import Topic, Chapter, ClassLevel, Subject

def import_topics(csv_path):
    print(f"Importing topics from {csv_path}...")
    with open(csv_path, 'r', encoding='windows-1252') as f:
        reader = csv.DictReader(f)
        created_count = 0
        updated_count = 0
        for row_idx, row in enumerate(reader, start=2):
            if '\ufeffName' in row:
                name = row['\ufeffName'].strip()
            else:
                name = row.get('Name', '').strip()
                
            chapter_name = row.get('Chapter', '').strip()
            class_level_name = row.get('Class Level', '').strip()
            subject_name = row.get('Subject', '').strip()
            code = row.get('Code', '').strip()
            sort_order_str = row.get('Sort Order', '1').strip()
            is_active_str = row.get('Is Active', 'TRUE').strip().upper()
            
            if not name or not class_level_name or not subject_name:
                print(f"Skipping invalid row {row_idx}: {row}")
                continue
                
            try:
                sort_order = int(sort_order_str)
            except ValueError:
                sort_order = 1
                
            is_active = is_active_str == 'TRUE'
            
            class_level, _ = ClassLevel.objects.get_or_create(name=class_level_name)
            subject, _ = Subject.objects.get_or_create(name=subject_name)
            
            chapter = None
            if chapter_name:
                chapter, _ = Chapter.objects.get_or_create(
                    name=chapter_name,
                    class_level=class_level,
                    subject=subject,
                    defaults={'is_active': is_active}
                )
            
            if code:
                topic, created = Topic.objects.update_or_create(
                    code=code,
                    defaults={
                        'name': name,
                        'chapter': chapter,
                        'class_level': class_level,
                        'subject': subject,
                        'sort_order': sort_order,
                        'is_active': is_active
                    }
                )
            else:
                topic, created = Topic.objects.update_or_create(
                    name=name,
                    chapter=chapter,
                    class_level=class_level,
                    subject=subject,
                    defaults={
                        'sort_order': sort_order,
                        'is_active': is_active
                    }
                )
                
            if created:
                created_count += 1
            else:
                updated_count += 1
                
        print(f"Import complete! Created {created_count} topics, Updated {updated_count} topics.")

if __name__ == '__main__':
    csv_file = r"A:\Pathfinder_student_portal\topics_export.csv"
    import_topics(csv_file)
