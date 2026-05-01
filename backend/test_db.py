import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from master_data.models import LibraryItem, LibraryVideo
from bson import ObjectId

video = LibraryVideo.objects.last()
if video:
    print(f"Video ID: {video.id}, Type: {type(video.id)}")
    
    item = video.library_item
    count_before = item.videos.count()
    
    keep_ids = [ObjectId(str(video.id))]
    print("Keeping ID:", keep_ids)
    
    # Try excluding this ID and deleting others
    item.videos.exclude(id__in=keep_ids).delete()
    count_after = item.videos.count()
    
    print(f"Before: {count_before}, After: {count_after}")
else:
    print("No video found")
