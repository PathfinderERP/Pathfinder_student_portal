"""
Data Migration Script: MasterSection Separation
- Copies all Section records where test_id=null into the new MasterSection model
- Rebuilds the Test.allotted_sections junction table to point to the new MasterSection IDs
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from sections.models import Section
from master_data.models import MasterSection
from tests.models import Test

def run():
    print("=" * 60)
    print("STEP 1: Migtrating master sections into MasterSection model")
    print("=" * 60)

    old_master_sections = list(Section.objects.filter(test__isnull=True))
    print(f"Found {len(old_master_sections)} master sections to migrate.")

    # Map old Section pk -> new MasterSection object
    old_id_to_new = {}

    for old_sec in old_master_sections:
        # Create a new MasterSection with the same data
        new_sec, created = MasterSection.objects.get_or_create(
            name=old_sec.name,
            defaults={
                'subject_code': old_sec.subject_code or 'GEN',
                'total_questions': old_sec.total_questions or 20,
                'allowed_questions': old_sec.allowed_questions or 20,
                'shuffle': old_sec.shuffle or False,
                'correct_marks': old_sec.correct_marks or 4.0,
                'negative_marks': old_sec.negative_marks or 1.0,
                'partial_type': old_sec.partial_type or 'regular',
                'partial_marks': old_sec.partial_marks or 0.0,
                'priority': old_sec.priority or 1,
                'is_active': True,
            }
        )
        old_id_to_new[str(old_sec.pk)] = new_sec
        status = "CREATED" if created else "ALREADY EXISTS"
        print(f"  [{status}] '{old_sec.name}' (old id={old_sec.pk}) -> new id={new_sec.id}")

    print()
    print("=" * 60)
    print("STEP 2: Rebuilding Test.allotted_sections with new MasterSection IDs")
    print("=" * 60)

    all_tests = list(Test.objects.all())
    updated_count = 0

    for test in all_tests:
        # Read the OLD allotted sections (still stored in the old junction table linked to Section model)
        # Since we faked the migration, the junction table still has the old Section IDs
        # We use raw pymongo to read these
        from django.db import connection
        cursor = connection.cursor()
        
        try:
            cursor.execute(
                "SELECT section_id FROM tests_test_allotted_sections WHERE test_id = %s",
                [test.id]
            )
            rows = cursor.fetchall()
        except Exception as e:
            print(f"  [SKIP] Test '{test.name}': could not read allotted_sections - {e}")
            continue
        finally:
            cursor.close()

        if not rows:
            continue

        # Map old Section IDs to new MasterSection objects
        new_sections = []
        for (old_section_id,) in rows:
            old_section_id_str = str(old_section_id)
            if old_section_id_str in old_id_to_new:
                new_sections.append(old_id_to_new[old_section_id_str])
            else:
                print(f"  [WARN] Old section id={old_section_id_str} not found in migrated master sections")

        if new_sections:
            test.allotted_sections.set(new_sections)
            updated_count += 1
            names = [s.name for s in new_sections]
            print(f"  Test '{test.name}' -> allotted: {names}")

    print()
    print("=" * 60)
    print(f"DONE! {len(old_master_sections)} sections migrated, {updated_count} tests updated.")
    print("=" * 60)

run()
