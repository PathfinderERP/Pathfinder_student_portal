import os
import django

import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.append(os.getcwd())
django.setup()

from master_data.models import Chapter, Topic, ClassLevel, Subject

def check_data():
    chapters = Chapter.objects.filter(name__icontains="HEAT AND TEMPERATURE")
    print(f"Found {chapters.count()} chapters with that name.")
    for c in chapters:
        print(f"Chapter ID: {c.id}, Name: {c.name}, Class: {c.class_level.name} ({c.class_level_id}), Subject: {c.subject.name} ({c.subject_id})")
        topics = Topic.objects.filter(chapter=c)
        print(f"  Topics for this chapter: {topics.count()}")
        for t in topics:
            print(f"    Topic ID: {t.id}, Name: {t.name}, Class in Topic: {t.class_level_id}, Subject in Topic: {t.subject_id}")

if __name__ == "__main__":
    check_data()
