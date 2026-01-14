import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from sections.models import Section

def list_sections():
    print("--- Current Sections in MongoDB ---")
    sections = Section.objects.all()
    print(f"Count: {sections.count()}")
    for s in sections:
        print(f"ID: {s._id}, Code: {s.code}, Name: {s.name}")
    print("-----------------------------------")

if __name__ == "__main__":
    list_sections()
