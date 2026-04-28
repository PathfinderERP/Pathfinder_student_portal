import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.append(os.getcwd())
django.setup()

from master_data.models import Chapter, Topic

def repair_topics():
    print("Starting master data Topic-Chapter alignment repair...")
    topics = Topic.objects.all()
    repaired_count = 0
    skipped_count = 0
    
    for t in topics:
        if t.chapter and t.chapter.class_level_id != t.class_level_id:
            # Found a mismatch. Look for the correct chapter in the correct class with same name
            correct_chapter = Chapter.objects.filter(
                name=t.chapter.name, 
                class_level=t.class_level,
                subject=t.subject
            ).first()
            
            if correct_chapter:
                print(f"FIXING: Topic '{t.name}' (ID: {t.id})")
                print(f"  Old Chapter: {t.chapter.name} (ID: {t.chapter.id}, Class: {t.chapter.class_level.name})")
                print(f"  New Chapter: {correct_chapter.name} (ID: {correct_chapter.id}, Class: {correct_chapter.class_level.name})")
                t.chapter = correct_chapter
                t.save()
                repaired_count += 1
            else:
                print(f"WARNING: No matching chapter found for '{t.name}' in class '{t.class_level.name}'")
                skipped_count += 1
                
    print(f"\nRepair Summary:")
    print(f"----------------")
    print(f"Successfully repaired: {repaired_count} topics")
    print(f"Failed to find match : {skipped_count} topics")
    print("----------------")

if __name__ == "__main__":
    repair_topics()
