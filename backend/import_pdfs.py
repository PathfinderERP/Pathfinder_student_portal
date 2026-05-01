import os
import django
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from master_data.models import LibraryPDF, LibraryItem

with open(r"f:\student portal\studentportal_dev.master_data_librarypdf010520262022 - Copy.json", "r") as f:
    data = json.load(f)

for row in data:
    try:
        library_item = LibraryItem.objects.get(id=row["library_item_id"])
        
        pdf, created = LibraryPDF.objects.get_or_create(
            id=row["id"],
            defaults={
                "library_item": library_item,
                "title": row.get("title", ""),
                "description": row.get("description", ""),
                "file": row.get("file", ""),
                "thumbnail": row.get("thumbnail", "")
            }
        )
        if created:
            print(f"Created PDF {pdf.id} for item {library_item.id}")
        else:
            print(f"PDF {pdf.id} already exists")
    except LibraryItem.DoesNotExist:
        print(f"Skipping PDF {row['id']} - LibraryItem {row['library_item_id']} does not exist")

print("Import completed!")
