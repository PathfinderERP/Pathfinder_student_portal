import os
import requests
import django
import sys

# Setup django
base_dir = os.path.dirname(os.path.abspath(__file__))
if base_dir not in sys.path:
    sys.path.append(base_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.erp_views import _get_erp_url, _get_erp_admin_token

erp_url = _get_erp_url()
print(f"ERP URL: {erp_url}")
token = _get_erp_admin_token(force_refresh=True)

if not token:
    print("Failed to get admin token.")
    sys.exit(1)

endpoints = [
    f"{erp_url}/api/student-portal/teachers?limit=1000",
    f"{erp_url}/api/hr/employee?limit=1000",
]

for endpoint in endpoints:
    print(f"\n--- Trying {endpoint} ---")
    resp = requests.get(endpoint, headers={"Authorization": f"Bearer {token}"}, timeout=20)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        raw_data = resp.json()
        current_endpoint = endpoint
        
        # Extract the raw list based on response structure
        raw_list = []
        if isinstance(raw_data, list):
            raw_list = raw_data
        elif isinstance(raw_data, dict):
            raw_list = raw_data.get('employees') or raw_data.get('data') or raw_data.get('teachers') or []

        print(f"Found {len(raw_list)} items in list")

        final_data = []
        for item in raw_list:
            try:
                # Meta info extraction
                academic = item.get('academicInfo', {}) or {}
                gender = academic.get('gender', '')
                emp_type = academic.get('employmentType', '')
                
                # Role check (if coming from bulk employee list)
                user_meta = item.get('user') or {}
                role = (user_meta.get('role') or item.get('role') or '').lower()
                
                # If we are in the general employee list, ensure we only take teachers/faculty
                if 'employee' in current_endpoint:
                    if 'teacher' not in role and 'staff' not in role and not item.get('teacherType') and not item.get('subject'):
                        continue

                def _safe_str(val):
                    if not val: return ""
                    if isinstance(val, dict):
                        return val.get('name') or val.get('centreName') or val.get('departmentName') or str(val)
                    return str(val)

                # Subject & Department Mapping (Prioritize user-specific subject first)
                name = item.get('name') or item.get('teacherName') or 'Unknown'
                subject = _safe_str(user_meta.get('subject') or item.get('subject') or user_meta.get('teacherDepartment') or item.get('department') or item.get('teacherDepartment') or 'General')
                dept = _safe_str(user_meta.get('teacherDepartment') or item.get('department') or item.get('teacherDepartment') or 'Academic')
                desig = _safe_str(user_meta.get('designation') or item.get('designation') or 'Faculty')
                
                # Centres can be in 'centres' or 'user.centres' or 'primaryCentre'
                raw_centres = item.get('centres') or user_meta.get('centres') or []
                if not raw_centres and item.get('primaryCentre'):
                    raw_centres = [item.get('primaryCentre')]
                centres = [_safe_str(c) for c in raw_centres]
                
                # Teacher Type / Employment
                t_type = _safe_str(item.get('typeOfEmployment') or item.get('teacherType') or user_meta.get('teacherType') or emp_type or 'Full-Time')

                final_data.append({
                    'id': str(item.get('_id') or item.get('id') or ''),
                    'name': _safe_str(name),
                    'email': str(item.get('email') or '').strip().lower(),
                    'phone': str(item.get('mobNum') or item.get('phoneNumber') or item.get('mobileNum') or ''),
                    'subject': subject,
                    'subject_name': subject,
                    'code': str(item.get('employeeId') or item.get('code') or (str(item.get('_id'))[-6:].upper() if item.get('_id') else 'N/A')),
                    'qualification': t_type,
                    'teacherType': t_type,
                    'centres': centres,
                    'teacherDepartment': dept,
                    'boardType': _safe_str(item.get('boardType') or user_meta.get('boardType') or 'NEET/JEE'),
                    'designation': desig,
                    'isDeptHod': bool(item.get('isDeptHod') or user_meta.get('isDeptHod')),
                    'isBoardHod': bool(item.get('isBoardHod') or user_meta.get('isBoardHod')),
                    'isSubjectHod': bool(item.get('isSubjectHod') or user_meta.get('isSubjectHod')),
                    'academicInfo': {
                        'joiningDate': _safe_str(item.get('dateOfJoining') or academic.get('joiningDate')),
                        'employmentType': _safe_str(item.get('typeOfEmployment') or academic.get('employmentType')),
                        'gender': _safe_str(item.get('gender') or academic.get('gender'))
                    }
                })
            except Exception as e:
                print(f"Error mapping item: {e}")

        print(f"Successfully parsed {len(final_data)} teacher records")
        if final_data:
            print(f"First item name: {final_data[0]['name']}")
        
        # Stop after first successful endpoint if needed, but here we test both
    else:
        print(f"Text: {resp.text[:200]}")
