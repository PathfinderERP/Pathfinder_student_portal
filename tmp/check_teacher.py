import os
import requests
import json

# Setup Django if needed, but since we are running in the environment, we can just use requests
def check_teacher():
    erp_url = 'https://pfndrerp.in'
    admin_email = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
    admin_pass = os.getenv('ERP_ADMIN_PASSWORD', '000000')
    
    # 1. Get Admin Token
    resp = requests.post(
        f"{erp_url}/api/superAdmin/login",
        json={"email": admin_email, "password": admin_pass},
        timeout=20
    )
    
    if resp.status_code != 200:
        print(f"Failed to get admin token: {resp.status_code}")
        return
        
    token = resp.json().get('token')
    print(f"Got admin token.")
    
    # 2. Fetch all teachers
    teacher_endpoints = [
        f"{erp_url}/api/student-portal/teachers?limit=2000",
        f"{erp_url}/api/hr/employee?limit=2000"
    ]
    
    target_email = "abhijitpayra@gmail.com"
    found = False
    
    for url in teacher_endpoints:
        print(f"Checking {url}...")
        resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=20)
        if resp.status_code == 200:
            data = resp.json()
            # Handle list or dict
            teachers = data if isinstance(data, list) else (data.get('data') or data.get('employees') or [])
            for t in teachers:
                email = (t.get('email') or '').lower()
                if email == target_email:
                    print(f"FOUND TEACHER: {json.dumps(t, indent=2)}")
                    found = True
                    break
        if found: break
        
    if not found:
        print(f"Teacher {target_email} NOT FOUND in ERP.")

if __name__ == "__main__":
    check_teacher()
