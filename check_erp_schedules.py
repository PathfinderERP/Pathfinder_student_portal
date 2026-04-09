import requests
import json
import os
from dotenv import load_dotenv

# Load env from backend folder
load_dotenv('backend/.env')

ERP_URL = os.getenv('ERP_API_URL', 'https://pfndrerp.in').strip().rstrip('/')
ERP_EMAIL = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
ERP_PASSWORD = os.getenv('ERP_ADMIN_PASSWORD', '000000')

def get_token():
    print(f"Logging in to ERP at {ERP_URL}...")
    resp = requests.post(f"{ERP_URL}/api/superAdmin/login", 
                         json={"email": ERP_EMAIL, "password": ERP_PASSWORD}, timeout=30)
    if resp.status_code == 200:
        return resp.json().get('token')
    print(f"Login failed: {resp.status_code} {resp.text}")
    return None

def check_schedules():
    token = get_token()
    if not token: return
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch some students
    print("Fetching students from ERP...")
    resp = requests.get(f"{ERP_URL}/api/admission", headers=headers, timeout=30)
    if resp.status_code != 200:
        print(f"Failed to fetch admissions: {resp.status_code}")
        return
    
    data = resp.json()
    if isinstance(data, list):
        students = data
    else:
        students = data.get('data') or data.get('admissions') or data or []
    
    if not isinstance(students, list):
        print("Admissions response is not a list")
        return
    
    print(f"Found {len(students)} students. Probing first 20 for schedules...")
    
    any_found = False
    for s in students[:20]:
        s_id = s.get('student', {}).get('_id') or s.get('_id')
        s_name = 'Unknown'
        details = s.get('student', {}).get('studentsDetails', [])
        if details: s_name = details[0].get('studentName', 'Unknown')
        
        if not s_id: continue
        
        print(f"\nChecking student: {s_name} ({s_id})")
        
        # Check Ongoing
        ongoing_res = requests.get(f"{ERP_URL}/api/student-portal/classes/ongoing/{s_id}", headers=headers, timeout=10)
        ongoing_data = []
        if ongoing_res.status_code == 200:
            ongoing_data = ongoing_res.json()
            if isinstance(ongoing_data, dict): ongoing_data = ongoing_data.get('data') or []
            if ongoing_data:
                print(f"  [ONGOING] FOUND {len(ongoing_data)} classes!")
                any_found = True
        
        # Check Upcoming
        upcoming_res = requests.get(f"{ERP_URL}/api/student-portal/classes/upcoming/{s_id}", headers=headers, timeout=10)
        upcoming_data = []
        if upcoming_res.status_code == 200:
            upcoming_data = upcoming_res.json()
            if isinstance(upcoming_data, dict): upcoming_data = upcoming_data.get('data') or []
            if upcoming_data:
                print(f"  [UPCOMING] FOUND {len(upcoming_data)} classes!")
                any_found = True
        
        # Check Base (History)
        base_res = requests.get(f"{ERP_URL}/api/student-portal/classes?studentId={s_id}", headers=headers, timeout=10)
        if base_res.status_code == 200:
            base_data = base_res.json()
            if isinstance(base_data, dict): base_data = base_data.get('data') or []
            if base_data:
                print(f"  [HISTORY] FOUND {len(base_data)} total classes in history.")
                any_found = True
                
        if not ongoing_data and not upcoming_data and not (base_res.status_code == 200 and base_data):
            print("  No classes found anywhere for this student.")

    if not any_found:
        print("\n--- RESULTS SUMMARY ---")
        print("No ongoing or upcoming classes found for the probed students.")
    else:
        print("\n--- RESULTS SUMMARY ---")
        print("Found active classes in the ERP!")

if __name__ == "__main__":
    check_schedules()
