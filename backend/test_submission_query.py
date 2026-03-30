import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test, TestSubmission
from api.models import CustomUser
from api.db_utils import get_db
from bson import ObjectId

def test_submission_query():
    try:
        user = CustomUser.objects.filter(user_type='student').first()
        test = Test.objects.first()
        if not user or not test:
            print("No data to test")
            return
            
        print(f"Testing submission query for student {user.username} and test {test.id}")
        
        # This is exactly what the serializer does
        sub = TestSubmission.objects.filter(test=test, student=user).first()
        print(f"Submission found via ORM: {sub}")

        # Now test the one that the user reported (the dashoard one with NOT allow_resume)
        print("Testing dashboard submission query (the 500 causer)")
        subs = TestSubmission.objects.filter(
            student=user, 
            is_finalized=True,
            allow_resume=False
        )
        # Execute it
        print(f"Count via ORM: {subs.count()}")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_submission_query()
