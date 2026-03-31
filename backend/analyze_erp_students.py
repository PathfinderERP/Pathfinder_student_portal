import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables from the server root
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)

ERP_URL = os.getenv('ERP_API_URL', 'https://pfndrerp.in').strip().rstrip('/')
ADMIN_EMAIL = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
ADMIN_PASS = os.getenv('ERP_ADMIN_PASSWORD', '000000')

def get_token():
    try:
        resp = requests.post(
            f"{ERP_URL}/api/superAdmin/login", 
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASS},
            timeout=30
        )
        if resp.status_code == 200:
            return resp.json().get('token')
        else:
            print(f"Token fetch failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Token fetch error: {e}")
    return None

def analyze():
    token = get_token()
    if not token:
        print("Failed to get admin token.")
        return
    
    print(f"Fetching all students from {ERP_URL}/api/admission (this may take a minute)...")
    try:
        resp = requests.get(
            f"{ERP_URL}/api/admission", 
            headers={"Authorization": f"Bearer {token}"}, 
            timeout=180
        )
        if resp.status_code != 200:
            print(f"Failed to fetch students: {resp.status_code}")
            return
        
        data = resp.json()
        students = []
        if isinstance(data, dict):
            students = data.get('data') or data.get('admissions') or data.get('students') or []
        elif isinstance(data, list):
            students = data
        
        total = len(students)
        print(f"Total students fetched from ERP: {total}")
        
        exam_sections = {}
        study_sections = {}
        
        has_exam_section = 0
        has_study_section = 0
        has_both = 0
        has_either = 0
        
        for s in students:
            sec = s.get('sectionAllotment', {})
            es = sec.get('examSection')
            ss = sec.get('studySection')
            
            # Clean up empty strings or lists-as-strings
            if es and str(es).strip() and str(es).strip() != '[]':
                has_exam_section += 1
                es_str = str(es).strip()
                exam_sections[es_str] = exam_sections.get(es_str, 0) + 1
            
            if ss and str(ss).strip() and str(ss).strip() != '[]':
                has_study_section += 1
                ss_str = str(ss).strip()
                study_sections[ss_str] = study_sections.get(ss_str, 0) + 1
            
            if (es and str(es).strip() and str(es).strip() != '[]') and (ss and str(ss).strip() and str(ss).strip() != '[]'):
                has_both += 1
                
            if (es and str(es).strip() and str(es).strip() != '[]') or (ss and str(ss).strip() and str(ss).strip() != '[]'):
                has_either += 1
                
        print(f"\nAnalysis Summary:")
        print(f"-----------------")
        print(f"Total ERP Students: {total}")
        print(f"Students with Exam Section alloted: {has_exam_section}")
        print(f"Students with Study Section alloted: {has_study_section}")
        print(f"Students with BOTH Sections alloted: {has_both}")
        print(f"Students with AT LEAST ONE Section alloted: {has_either}")
        print(f"Students with NO Section alloted: {total - has_either}")
        
        print("\nMajor Exam Sections Found:")
        for name, count in sorted(exam_sections.items(), key=lambda x: x[1], reverse=True)[:20]:
            print(f"- {name}: {count}")
        if len(exam_sections) > 20:
             print(f"... and {len(exam_sections) - 20} more.")
            
        print("\nMajor Study Sections Found:")
        for name, count in sorted(study_sections.items(), key=lambda x: x[1], reverse=True)[:20]:
            print(f"- {name}: {count}")
        if len(study_sections) > 20:
             print(f"... and {len(study_sections) - 20} more.")

    except Exception as e:
        print(f"Analysis error: {e}")

if __name__ == "__main__":
    analyze()
