import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.db_utils import get_db
from bson import ObjectId

def inspect_db():
    db = get_db()
    if db is None:
        print("DB connection failed")
        return
        
    coll = db['tests_testsubmission']
    doc = coll.find_one()
    if not doc:
        print("No documents found in tests_testsubmission")
        return
        
    print(f"Record: {doc}")
    print(f"Type of _id: {type(doc.get('_id'))}")
    print(f"Type of student_id: {type(doc.get('student_id'))}")
    print(f"Type of test_id: {type(doc.get('test_id'))}")

if __name__ == "__main__":
    inspect_db()
