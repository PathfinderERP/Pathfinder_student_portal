import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from api.db_utils import get_db
from django.contrib.auth import get_user_model
u = get_user_model().objects.filter(first_name__icontains="Ambarish").first()
db = get_db()
sub = db['tests_testsubmission'].find_one({'test_id': 18, 'student_id': u.pk})
if sub:
    print(f"Sub keys: {list(sub.keys())}")
    print(f"Submission recorded score: {sub.get('score')}")
    print(f"Length of responses: {len(sub.get('responses', {}))}")
else:
    print("No sub found for Ambarish in DB.")
