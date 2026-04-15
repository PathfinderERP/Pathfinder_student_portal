import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from tests.models import Test, TestCentreAllotment, TestSubmission
from django.utils import timezone
from django.db.models import Max

now = timezone.now()
print(f"Current Time: {now}\n")

# 1. Get tests explicitly marked as completed
completed_tests = Test.objects.filter(is_completed=True)
completed_ids = set(completed_tests.values_list('id', flat=True))

# 2. Get tests where all allotments have expired
# A test is 'Expired' if its MAX end_time is in the past
expired_tests_ids = []
all_tests = Test.objects.all().prefetch_related('centre_allotments')

for t in all_tests:
    allotments = t.centre_allotments.all()
    if not allotments:
        # If no allotments, it's 'old' or 'draft' - check created_at?
        # User said 'expired/missed', so we'll only target those with allotments that passed
        continue
        
    max_end_time = max((a.end_time for a in allotments if a.end_time), default=None)
    
    if max_end_time and max_end_time < now:
        expired_tests_ids.append(t.id)

# Combine IDs
to_delete_ids = completed_ids.union(set(expired_tests_ids))

print(f"Found {len(completed_ids)} tests marked 'Completed'.")
print(f"Found {len(expired_tests_ids)} tests marked 'Expired' (All allotments passed).")
print(f"Total Unique Tests to delete: {len(to_delete_ids)}")

if not to_delete_ids:
    print("No tests match the criteria for deletion.")
    exit()

# List them before deleting
print("\nTests to be DELETED:")
for t in Test.objects.filter(id__in=to_delete_ids):
    print(f"- {t.name} (Code: {t.code})")

# PERFORM DELETION
# Django models on_delete=CASCADE should handle allotments and results
deleted_count, detail = Test.objects.filter(id__in=to_delete_ids).delete()
print(f"\nSuccessfully deleted {deleted_count} records.")
print(f"Details: {detail}")

# Clear cache
from django.core.cache import cache
cache.delete("admin_test_list")
print("Caches cleared.")
