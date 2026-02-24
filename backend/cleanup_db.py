import os
import django
import sys
from pymongo import MongoClient

# Use local settings
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings

def main():
    try:
        host = settings.DATABASES['default']['CLIENT']['host']
        db_name = settings.DATABASES['default']['NAME']
        client = MongoClient(host)
        db = client[db_name]
        
        print(f"Connecting to: {db_name}")
        
        # 1. Count before
        count = db.api_grievance.count_documents({})
        print(f"Current grievances: {count}")
        
        # 2. Delete corruptions
        # Entries where student_name starts with %
        res1 = db.api_grievance.delete_many({"student_name": {"$regex": "^%"}})
        print(f"Deleted regex %: {res1.deleted_count}")
        
        # Entries where student_name is literal placeholder
        res2 = db.api_grievance.delete_many({"student_name": "%(0"})
        print(f"Deleted literal placeholder: {res2.deleted_count}")
        
        # Entries with null or empty subject
        res3 = db.api_grievance.delete_many({"subject": {"$in": [None, "", "null"]}})
        print(f"Deleted null subjects: {res3.deleted_count}")

        # 3. Final count
        new_count = db.api_grievance.count_documents({})
        print(f"Remaining grievances: {new_count}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
