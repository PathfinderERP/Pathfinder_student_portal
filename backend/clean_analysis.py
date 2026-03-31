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
        
        total = len(students)
        with_section = 0
        study_sections = {}
        exam_sections = {}
        
        for s in students:
            sec = s.get('sectionAllotment', {})
            es = str(sec.get('examSection') or '').strip()
            ss = str(sec.get('studySection') or '').strip()
            
            es_valid = es and es != '[]' and es != "None"
            ss_valid = ss and ss != '[]' and ss != "None"
            
            if es_valid or ss_valid:
                with_section += 1
            
            if es_valid:
                exam_sections[es] = exam_sections.get(es, 0) + 1
            if ss_valid:
                study_sections[ss] = study_sections.get(ss, 0) + 1
        
        print(f"--- ERP STUDENT SECTION ANALYSIS ---")
        print(f"Total students found: {total}")
        print(f"Students with at least one section allotted: {with_section}")
        print(f"Students with NO section: {total - with_section}")
        
        print(f"\n--- STUDY SECTIONS ---")
        for k, v in sorted(study_sections.items(), key=lambda x: x[1], reverse=True):
            print(f"{v: >5} | {k}")
            
        print(f"\n--- EXAM SECTIONS ---")
        for k, v in sorted(exam_sections.items(), key=lambda x: x[1], reverse=True):
            print(f"{v: >5} | {k}")

    except Exception as e:
        print(f"FAIL: {e}")

if __name__ == "__main__":
    run()
