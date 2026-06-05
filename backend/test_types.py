import os
import sys

sys.path.append('a:\\Pathfinder_student_portal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from tests.models import TestSubmission
from api.models import CustomUser

subs = TestSubmission.objects.all()[:1]
if subs:
    sub = subs[0]
    print("student_id type:", type(sub.student_id), sub.student_id)
    print("student._id type:", type(sub.student._id), sub.student._id)
    
    m = {sub.student_id: sub}
    print("Map get with student_id:", m.get(sub.student_id) is not None)
    print("Map get with student._id:", m.get(sub.student._id) is not None)
    
    # Try string
    print("Map get with str:", m.get(str(sub.student_id)) is not None)
