import os
import django
import json
from django.core.serializers import serialize

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from master_data.models import LibraryItem, LibraryPDF, LibraryVideo

def backup_library():
    print("Starting backup of Study Materials...")
    
    try:
        # Fetch all records
        items = LibraryItem.objects.all()
        pdfs = LibraryPDF.objects.all()
        videos = LibraryVideo.objects.all()
        
        # Serialize to JSON format
        # Note: We use json.loads(serialize(...)) to get a clean dict structure
        data = {
            "metadata": {
                "total_items": items.count(),
                "total_pdfs": pdfs.count(),
                "total_videos": videos.count(),
                "timestamp": str(django.utils.timezone.now())
            },
            "library_items": json.loads(serialize('json', items)),
            "library_pdfs": json.loads(serialize('json', pdfs)),
            "library_videos": json.loads(serialize('json', videos)),
        }
        
        filename = 'library_backup_full.json'
        with open(filename, 'w') as f:
            json.dump(data, f, indent=4)
            
        print(f"Success! Backup saved to: {os.path.abspath(filename)}")
        print(f"Summary: {items.count()} items, {pdfs.count()} PDFs, {videos.count()} Videos.")
        
    except Exception as e:
        print(f"Error during backup: {str(e)}")

if __name__ == "__main__":
    backup_library()
