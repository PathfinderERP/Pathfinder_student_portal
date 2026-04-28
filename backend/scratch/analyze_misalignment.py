import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.append(os.getcwd())
django.setup()

from master_data.models import Chapter, Topic, ClassLevel, Subject

def check_class_7_data():
    class_7 = ClassLevel.objects.get(id=15)
    physics = Subject.objects.get(id=1)
    
    print(f"Checking data for Class: {class_7.name}, Subject: {physics.name}")
    
    chapters = Chapter.objects.filter(class_level=class_7, subject=physics)
    print(f"Total Chapters: {chapters.count()}")
    for c in chapters:
        topics = Topic.objects.filter(chapter=c)
        print(f"Chapter: {c.name} (ID: {c.id}) - Topics: {topics.count()}")
        
    print("\nChecking Topics for Class 7, Physics that might be mislinked:")
    mislinked = Topic.objects.filter(class_level=class_7, subject=physics).exclude(chapter__class_level=class_7)
    print(f"Found {mislinked.count()} mislinked topics (Topic class matches Class 7, but its Chapter belongs to another class).")
    for t in mislinked:
        print(f"Topic: {t.name} (ID: {t.id}) - Linked to Chapter: {t.chapter.name if t.chapter else 'None'} (Chapter Class: {t.chapter.class_level.name if t.chapter else 'N/A'})")

    print("\nChecking Topics for Class 7, Physics with NO chapter:")
    no_chapter = Topic.objects.filter(class_level=class_7, subject=physics, chapter__isnull=True)
    print(f"Found {no_chapter.count()} topics with no chapter.")
    for t in no_chapter:
        print(f"Topic: {t.name} (ID: {t.id})")

if __name__ == "__main__":
    check_class_7_data()
