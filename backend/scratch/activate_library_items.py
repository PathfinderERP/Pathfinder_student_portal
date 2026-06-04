import os
import django
import sys

sys.path.append(os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from master_data.models import LibraryItem

print("Starting activation loop on all items...")
count = 0
for item in LibraryItem.objects.all():
    if not item.is_active:
        item.is_active = True
        item.save()
        count += 1

print(f"Loop completed. Manually saved {count} library items.")
