import os
import sys

sys.path.append('a:\\Pathfinder_student_portal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from api.erp_views import get_student_lookup_index, _sync_user_to_erp
from api.models import CustomUser

enroll_raw = "PATH26003738"
erp_idx = get_student_lookup_index(force_refresh=False, block=False)

if erp_idx:
    print(f"Total records in ERP cache: {len(erp_idx)}")
    erp_record = erp_idx.get(f"adm_{enroll_raw.upper()}")
    if erp_record:
        print("FOUND ERP RECORD!")
        print(erp_record.get('student', {}).get('studentsDetails', [{}])[0].get('studentName'))
    else:
        print(f"NOT FOUND: adm_{enroll_raw.upper()}")
        
        # print first 5 keys
        keys = list(erp_idx.keys())[:5]
        print("Sample keys:", keys)
else:
    print("ERP cache is empty!")
