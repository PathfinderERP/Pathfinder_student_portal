import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from master_data.models import LibraryVideo, LibraryItem

print("Total Library Items:", LibraryItem.objects.count())
print("Total Library Videos:", LibraryVideo.objects.count())

videos = LibraryVideo.objects.all().order_by('-created_at')[:5]
for v in videos:
    print(f"ID: {v.id}, Link: {v.video_link}, Thumb: {v.thumbnail}")
