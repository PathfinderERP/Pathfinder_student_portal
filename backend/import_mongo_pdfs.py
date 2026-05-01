import os
import django
from pymongo import MongoClient

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from master_data.models import (
    LibraryItem, LibraryPDF, Topic, Chapter, Subject, ClassLevel,
    Session, ExamType, TargetExam
)

def safe_fk(model, pk):
    """Return a model instance if pk exists, else None."""
    if not pk:
        return None
    try:
        return model.objects.get(id=pk)
    except model.DoesNotExist:
        return None

def run_import():
    client = MongoClient('mongodb+srv://pathtex:pathtex@pathtex.ariihtc.mongodb.net/studentportal')
    db = client['studentportal']

    print("--- IMPORTING LIBRARY ITEMS (FULL FIELDS) ---")
    library_items_data = list(db['master_data_libraryitem'].find({}))
    print(f"Found {len(library_items_data)} LibraryItems in MongoDB.")

    updated = 0
    created_count = 0
    errors = 0

    for row in library_items_data:
        try:
            item, created = LibraryItem.objects.update_or_create(
                id=row.get("id"),
                defaults={
                    "name":          row.get("name", ""),
                    "description":   row.get("description", ""),
                    "thumbnail":     row.get("thumbnail", ""),
                    "pdf_file":      row.get("pdf_file", ""),
                    "video_link":    row.get("video_link", ""),
                    "video_file":    row.get("video_file", ""),
                    "dpp_file":      row.get("dpp_file", ""),
                    "is_active":     row.get("is_active", True),
                    "session":       safe_fk(Session,    row.get("session_id")),
                    "class_level":   safe_fk(ClassLevel, row.get("class_level_id")),
                    "subject":       safe_fk(Subject,    row.get("subject_id")),
                    "chapter":       safe_fk(Chapter,    row.get("chapter_id")),
                    "topic":         safe_fk(Topic,      row.get("topic_id")),
                    "exam_type":     safe_fk(ExamType,   row.get("exam_type_id")),
                    "target_exam":   safe_fk(TargetExam, row.get("target_exam_id")),
                }
            )
            if created:
                print(f"  Created: LibraryItem {item.id} - {item.name}")
                created_count += 1
            else:
                print(f"  Updated: LibraryItem {item.id} - {item.name} | chapter={item.chapter}")
                updated += 1
        except Exception as e:
            print(f"  ERROR for row id={row.get('id')}: {e}")
            errors += 1

    print(f"\nLibraryItem Summary: {created_count} created, {updated} updated, {errors} errors.")

    print("\n--- IMPORTING PDFs ---")
    pdfs = list(db['master_data_librarypdf'].find({}))
    print(f"Found {len(pdfs)} PDFs in MongoDB.")

    pdf_imported = 0
    pdf_skipped = 0

    for row in pdfs:
        lib_id = row.get("library_item_id")
        try:
            library_item = LibraryItem.objects.get(id=lib_id)
            pdf, created = LibraryPDF.objects.get_or_create(
                id=row.get("id"),
                defaults={
                    "library_item": library_item,
                    "title":        row.get("title", ""),
                    "description":  row.get("description", ""),
                    "file":         row.get("file", ""),
                    "thumbnail":    row.get("thumbnail", "")
                }
            )
            if created:
                pdf_imported += 1
            else:
                pdf_skipped += 1
        except LibraryItem.DoesNotExist:
            print(f"  Skipping PDF ID {row.get('id')} - LibraryItem {lib_id} not found.")

    print(f"\nPDF Summary: {pdf_imported} imported, {pdf_skipped} already existed.")

    # Clear cache so frontend sees updated data immediately
    from django.core.cache import cache
    cache.clear()
    print("\nCache cleared. Refresh the browser to see updated data.")

if __name__ == '__main__':
    run_import()
