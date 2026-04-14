import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from master_data.models import LibraryItem, SolutionItem, Notice, LiveClass, Video, PenPaperTest, Homework

def run():
    print("=" * 30)
    print("REVERTING ALL CONTENT EXCEPT LIBRARY ITEMS")
    print("=" * 30)

    # FK models to revert
    models_fk = [Notice, LiveClass, Video]
    for model in models_fk:
        updated = model.objects.all().update(section=None)
        print(f"  {model.__name__}: Reset {updated} items to no section.")

    # M2M models to revert
    models_m2m = [SolutionItem, PenPaperTest, Homework]
    for model in models_m2m:
        count = 0
        for item in model.objects.all():
            item.sections.clear()
            count += 1
        print(f"  {model.__name__}: Cleared sections for {count} items.")

    print("=" * 30)
    print("FINISHED REVERSION")

if __name__ == "__main__":
    run()
