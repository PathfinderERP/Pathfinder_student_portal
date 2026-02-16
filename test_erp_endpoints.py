import requests
import json
import os

ERP_URL = os.getenv('ERP_API_URL', 'https://pfndrerp.in')
ERP_EMAIL = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
ERP_PASSWORD = os.getenv('ERP_ADMIN_PASSWORD', '000000')

print(f"Testing ERP Endpoints...")

try:
    # Login
    login_url = f"{ERP_URL}/api/superAdmin/login"
    payload = {"email": ERP_EMAIL, "password": ERP_PASSWORD}
    response = requests.post(login_url, json=payload, timeout=10)
    
    if response.status_code == 200:
        token = response.json().get('token')
        headers = {"Authorization": f"Bearer {token}"}
        print("Login Successful.")

        # 1. Get Student ID
        search_email = "example@gmail.com"
        admission_url = f"{ERP_URL}/api/admission?search={search_email}"
        adm_resp = requests.get(admission_url, headers=headers, timeout=30)
        
        student_id = None
        if adm_resp.status_code == 200:
            data = adm_resp.json()
            if len(data) > 0:
                student = data[0].get('student', {})
                student_id = student.get('_id')
                print(f"Found Student ID: {student_id}")
        
        if student_id:
            # 2. Test Attendance Endpoints
            print("\n--- Testing Attendance ---")
            att_endpoints = [
                f"/api/student-portal/attendance?studentId={student_id}",
                f"/api/academics/student-attendance/student/{student_id}",
                f"/api/academics/student-attendance/{student_id}",
                "/api/student-portal/attendance" # Maybe header based?
            ]
            
            for ep in att_endpoints:
                url = f"{ERP_URL}{ep}"
                print(f"GET {url}")
                resp = requests.get(url, headers=headers, timeout=10)
                print(f"Status: {resp.status_code}")
                if resp.status_code == 200:
                    print("SUCCESS!")
                    print(str(resp.json())[:200])
                    
            # 3. Test Classes Endpoints (Verification)
            print("\n--- Testing Classes ---")
            cls_endpoints = [
                f"/api/student-portal/classes?studentId={student_id}",
                "/api/academics/upcomingClass",
                f"/api/academics/upcomingClass?studentId={student_id}"
            ]
            
            for ep in cls_endpoints:
                url = f"{ERP_URL}{ep}"
                print(f"GET {url}")
                resp = requests.get(url, headers=headers, timeout=10)
                print(f"Status: {resp.status_code}")
                if resp.status_code == 200:
                    data = resp.json()
                    print(f"SUCCESS! Count: {len(data)}")

    else:
        print(f"Login Failed: {response.status_code}")

except Exception as e:
    print(f"Error: {e}")
