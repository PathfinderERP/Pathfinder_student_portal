import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from master_data.models import LibraryItem, LibraryVideo
from bson import ObjectId

video = LibraryVideo.objects.first()
if video:
    print(f"Video ID: {video.id}, Type: {type(video.id)}")
    print(f"Is valid ObjectId?: {ObjectId.is_valid(str(video.id))}")
else:
    print("No video found")
