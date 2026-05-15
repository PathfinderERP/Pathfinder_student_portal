import os
import django
from pymongo import MongoClient

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings
from api.db_utils import get_db

db = get_db()
if db is not None:
    collection = db['api_grievance']
    print("Listing last 3 grievances:")
    for doc in collection.find().sort('date', -1).limit(3):
        print(f"ID: {doc.get('_id')} | StudentID: {doc.get('student_id')} | StudentName: {doc.get('student_name')}")
        print(f"StudentClass (Stored): {doc.get('student_class')}")
else:
    print("Failed to get database connection.")
