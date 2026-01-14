import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from sections.models import Section

def clean_none_records():
    print("Cleaning up records with None values...")
    # Delete records where code or name is None
    deleted = Section.objects.filter(code__isnull=True).delete()
    print(f"Deleted records with null code: {deleted}")
    
    # Also delete records where code is exactly the string 'None' just in case
    deleted2 = Section.objects.filter(code='None').delete()
    print(f"Deleted records with 'None' string: {deleted2}")

if __name__ == "__main__":
    clean_none_records()
