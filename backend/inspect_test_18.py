import os
import django
import sys
from bson import ObjectId

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from api.db_utils import get_db

def inspect_test_18():
    test_id = 18
    print(f"Inspecting test_id: {test_id}")
    
    try:
        test = Test.objects.get(pk=test_id)
        print(f"Test found: {test.name}")
        for sec in test.allotted_sections.all():
            q_count = sec.questions.count()
            print(f"Section name: {sec.name}, QCount: {q_count}, Correct: {sec.correct_marks}, Neg: {sec.negative_marks}")
            # print(f"  Questions: {[q.id for q in sec.questions.all()]}")
    except Exception as e:
        print(f"Error getting test: {e}")
        return

    db = get_db()
    if db is None:
        print("Could not connect to MongoDB.")
        return
        
    try:
        # Try both direct int and ObjectId for test_id
        submissions = list(db['tests_testsubmission'].find({'test_id': test_id, 'is_finalized': True}))
        if not submissions:
            print("No submissions found with int test_id, trying ObjectId...")
            try:
                submissions = list(db['tests_testsubmission'].find({'test_id': ObjectId(test.pk), 'is_finalized': True}))
            except:
                pass
                
        print(f"Total finalized submissions found: {len(submissions)}")
        
        for sub in submissions[:3]:
            print(f"\nStudent ID: {sub.get('student_id')}, Marks: {sub.get('score')}")
            res = sub.get('responses', {})
            print(f"Responses count: {len(res)}")
            # print(f"Raw Score: {sub.get('score')}")
    except Exception as e:
        print(f"Error getting submissions from MongoDB: {e}")

if __name__ == "__main__":
    inspect_test_18()
