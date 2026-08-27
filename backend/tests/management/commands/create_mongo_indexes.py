"""
Management command: create_mongo_indexes
Creates compound indexes on tests_testsubmission for fast student result queries.
Run once: python manage.py create_mongo_indexes
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Creates compound indexes on tests_testsubmission in MongoDB for performance"

    def handle(self, *args, **options):
        try:
            from api.db_utils import get_db
            db = get_db()
            if db is None:
                self.stderr.write(self.style.ERROR("MongoDB unavailable. Check DB connection."))
                return

            col = db["tests_testsubmission"]

            indexes = [
                # Fast single-student result lookup (used by my_results)
                ([("student_id", 1), ("is_finalized", 1)], "student_finalized_idx"),
                # Fast per-test leaderboard aggregation
                ([("test_id", 1), ("is_finalized", 1)], "test_finalized_idx"),
                # Fast lookup by both (used by my_analysis, reflections)
                ([("test_id", 1), ("student_id", 1)], "test_student_idx"),
            ]

            for key_spec, name in indexes:
                try:
                    col.create_index(key_spec, name=name, background=True)
                    self.stdout.write(self.style.SUCCESS(f"  Created index: {name}"))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"  Index {name} already exists or error: {e}"))

            self.stdout.write(self.style.SUCCESS("All MongoDB indexes created successfully."))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Failed: {e}"))
