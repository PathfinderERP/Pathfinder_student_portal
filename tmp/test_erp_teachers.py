import requests
import os

def check_structure():
    erp_url = 'https://pfndrerp.in'
    login_resp = requests.post(f"{erp_url}/api/superAdmin/login", json={"email": "atanu@gmail.com", "password": "000000"}, timeout=30)
    token = login_resp.json().get('token')
    headers = {"Authorization": f"Bearer {token}"}
    
    url = f"{erp_url}/api/hr/employee?limit=1000"
    resp = requests.get(url, headers=headers, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        employees = data.get('employees', [])
        
        for e in employees:
            fields_to_check = ['subject', 'teacherDepartment', 'designation', 'teacherType']
            user_meta = e.get('user') or {}
            
            for field in fields_to_check:
                val = e.get(field) or user_meta.get(field)
                if isinstance(val, dict):
                    print(f"Found object in field '{field}': {val}")
                    return # Just need one example

if __name__ == "__main__":
    check_structure()
