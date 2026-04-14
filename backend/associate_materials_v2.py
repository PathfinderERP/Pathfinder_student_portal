import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from master_data.models import MasterSection, LibraryItem, SolutionItem, Notice, LiveClass, Video, PenPaperTest, Homework

def run():
    print("=" * 30)
    try:
        study_sec = MasterSection.objects.get(name__icontains='STUDY MATERIAL')
        print(f"Target Section: {study_sec.name} (ID: {study_sec.id})")
    except Exception as e:
        print(f"Error finding section: {e}")
        return

    # FK models
    models_fk = [LibraryItem, Notice, LiveClass, Video]
    for model in models_fk:
        objs = model.objects.all()
        print(f"Updating {model.__name__}: {objs.count()} items")
        updated = 0
        for obj in objs:
            obj.section = study_sec
            obj.save()
            updated += 1
        print(f"  {updated} items saved.")

    # M2M models
    models_m2m = [SolutionItem, PenPaperTest, Homework]
    for model in models_m2m:
        objs = model.objects.all()
        print(f"Updating {model.__name__}: {objs.count()} items")
        updated = 0
        for obj in objs:
            obj.sections.add(study_sec)
            updated += 1
        print(f"  {updated} items updated.")

    print("=" * 30)
    print("FINISHED")

if __name__ == "__main__":
    run()
