import os
import requests
import json
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)

ERP_URL = os.getenv('ERP_API_URL', 'https://pfndrerp.in').strip().rstrip('/')
ADMIN_EMAIL = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
ADMIN_PASS = os.getenv('ERP_ADMIN_PASSWORD', '000000')

def get_token():
    try:
        resp = requests.post(f"{ERP_URL}/api/superAdmin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
        return resp.json().get('token')
    except: return None

def run():
    token = get_token()
    if not token:
        print("FAIL: NO TOKEN")
        return
        
    try:
        resp = requests.get(f"{ERP_URL}/api/admission", headers={"Authorization": f"Bearer {token}"}, timeout=200)
        data = resp.json()
        students = data if isinstance(data, list) else (data.get('data') or data.get('admissions') or [])
        
        combinations = {}
        for s in students:
            sec = s.get('sectionAllotment', {})
            es = str(sec.get('examSection') or '').strip()
            ss = str(sec.get('studySection') or '').strip()
            # Clean
            es = es if es and es != '[]' and es != "None" else "None"
            ss = ss if ss and ss != '[]' and ss != "None" else "None"
            
            comb = (es, ss)
            combinations[comb] = combinations.get(comb, 0) + 1
            
        print(f"--- DETAILED STUDENT SECTION combinations ---")
        for (es, ss), count in sorted(combinations.items(), key=lambda x: x[1], reverse=True):
            print(f"{count: >5} students | Exam: {es: <15} | Study: {ss: <15}")

    except Exception as e:
        print(f"FAIL: {e}")

if __name__ == "__main__":
    run()
