import os
import django
import sys
from bson import ObjectId

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.db_utils import get_db

def inspect_submission_keys():
    db = get_db()
    test_id = 18
    # Try both formats
    try: t_pk = ObjectId(test_id)
    except: t_pk = test_id
    
    sub = db['tests_testsubmission'].find_one({'test_id': t_pk, 'is_finalized': True})
    if not sub:
        # Try finding by any finalized submission
        sub = db['tests_testsubmission'].find_one({'is_finalized': True})
        
    if sub:
        print(f"Submission for student: {sub.get('student_id')}")
        res = sub.get('responses') or {}
        if isinstance(res, str):
            import json
            res = json.loads(res)
        
        print(f"Response Keys: {list(res.keys())[:10]}...")
        # Check a sample
        first_key = list(res.keys())[0]
        print(f"Sample raw response for key {first_key}: {res[first_key]}")
    else:
        print("No finalized submissions found.")

if __name__ == "__main__":
    inspect_submission_keys()
