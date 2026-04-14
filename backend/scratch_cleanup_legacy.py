"""
Cleanup Script: Remove legacy master sections from the Section model
Run this ONLY after confirming MasterSection migration was successful.
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from sections.models import Section

def run():
    print("=" * 60)
    print("CLEANUP: Deleting legacy master sections from Section model")
    print("=" * 60)

    legacy_sections = Section.objects.filter(test__isnull=True)
    count = legacy_sections.count()
    
    if count == 0:
        print("No legacy master sections found. Cleanup already done.")
        return

    print(f"Found {count} legacy master sections. Deleting...")
    for sec in legacy_sections:
        print(f"  Deleting '{sec.name}' (id={sec.pk})")
        sec.delete()

    print(f"Cleanup complete. {count} sections removed.")
    print("=" * 60)

if __name__ == "__main__":
    run()
