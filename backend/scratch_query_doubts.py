import os
import sys
sys.path.append('f:\\student portal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from api.db_utils import get_db
db = get_db()
if db is not None:
    collection = db['api_doubt']
    for doc in list(collection.find()):
        print(f"ID: {doc.get('id')}, Teacher Name: {doc.get('teacher_name')}, Teacher ID: {doc.get('teacher_id')}, Status: {doc.get('status')}")
else:
    print("Database connection failed.")
