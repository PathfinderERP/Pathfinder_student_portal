"""
Script: Associate all materials with 'STUDY MATERIAL' section
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from master_data.models import MasterSection, LibraryItem, SolutionItem, Notice, LiveClass, Video, PenPaperTest, Homework

def run():
    print("=" * 60)
    print("UPDATING MATERIALS TO 'STUDY MATERIAL' SECTION")
    print("=" * 60)

    try:
        study_sec = MasterSection.objects.get(id=2)
        print(f"Found Section: {study_sec.name} (ID: 2)")
    except MasterSection.DoesNotExist:
        print("Error: MasterSection with ID 2 not found.")
        return

    # 1. Models with single 'section' foreign key
    models_fk = [
        (LibraryItem, "Library Items"),
        (Notice, "Notices"),
        (LiveClass, "Live Classes"),
        (Video, "Videos")
    ]

    for model, label in models_fk:
        items = model.objects.all()
        count = items.count()
        updated = items.update(section=study_sec)
        print(f"  {label}: Updated {updated} of {count} items.")

    # 2. Models with 'sections' many-to-many field
    models_m2m = [
        (SolutionItem, "Solution Items"),
        (PenPaperTest, "Pen Paper Tests"),
        (Homework, "Homework")
    ]

    for model, label in models_m2m:
        items = model.objects.all()
        count = 0
        for item in items:
            item.sections.add(study_sec)
            count += 1
        print(f"  {label}: Added section to {count} items.")

    print()
    print("=" * 60)
    print("UPDATE COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    run()
