import os
import sys
import django

sys.path.append(r"A:\Pathfinder_student_portal\backend")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from master_data.models import ClassLevel, Chapter, Topic, SubTopic, LibraryItem, SolutionItem, Notice, LiveClass, Video, PenPaperTest, Homework

def get_relations_count(c):
    return (
        Chapter.objects.filter(class_level=c).count() +
        Topic.objects.filter(class_level=c).count() +
        LibraryItem.objects.filter(class_level=c).count() +
        SolutionItem.objects.filter(class_level=c).count() +
        Notice.objects.filter(class_level=c).count() +
        LiveClass.objects.filter(class_level=c).count() +
        Video.objects.filter(class_level=c).count() +
        PenPaperTest.objects.filter(class_level=c).count() +
        Homework.objects.filter(class_level=c).count()
    )

for c in ClassLevel.objects.all():
    count = get_relations_count(c)
    print(f"ID: {c.id}, Name: '{c.name}', Related Objects: {count}")
    if c.name == 'class 10' and c.id == 12:
        if count == 0:
            c.delete()
            print("Deleted empty 'class 10'")
