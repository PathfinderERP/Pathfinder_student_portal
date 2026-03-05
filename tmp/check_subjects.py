import requests
import os

def check_subjects():
    erp_url = 'https://pfndrerp.in'
    login_resp = requests.post(f"{erp_url}/api/superAdmin/login", json={"email": "atanu@gmail.com", "password": "000000"}, timeout=30)
    token = login_resp.json().get('token')
    headers = {"Authorization": f"Bearer {token}"}
    
    url = f"{erp_url}/api/hr/employee?limit=1000"
    resp = requests.get(url, headers=headers, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        employees = data.get('employees', [])
        
        print("Sampling Subject structures (non-None):")
        found = 0
        for e in employees:
            subj = e.get('subject')
            teacherDept = e.get('teacherDepartment')
            
            if subj or teacherDept:
                print(f"Name: {e.get('name')} | Subject: {subj} ({type(subj)}) | Dept: {teacherDept} ({type(teacherDept)})")
                found += 1
            
            if found >= 15:
                break

if __name__ == "__main__":
    check_subjects()
