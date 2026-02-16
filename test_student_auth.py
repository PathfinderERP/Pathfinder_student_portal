import requests
import json
import os

ERP_URL = "https://pfndrerp.in"
STUDENT_EMAIL = "example@gmail.com"
# Admission number from my previous lookup
STUDENT_PASSWORD = "PATH26001166" 

print(f"Testing Student Login for {STUDENT_EMAIL} / {STUDENT_PASSWORD}")

url = f"{ERP_URL}/api/student-portal/login"
print(f"Testing {url}")

payloads = [
    {"username": STUDENT_EMAIL, "password": STUDENT_PASSWORD},
    {"email": STUDENT_EMAIL, "enrollmentNumber": STUDENT_PASSWORD},
    {"studentEmail": STUDENT_EMAIL, "enrollmentNumber": STUDENT_PASSWORD},
    {"email": STUDENT_EMAIL, "password": STUDENT_PASSWORD} 
]

for p in payloads:
    print(f"\nPayload Keys: {list(p.keys())}")
    try:
        resp = requests.post(url, json=p, timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code == 200:
            print("SUCCESS! Login Works!")
            print(f"Response Keys: {list(resp.json().keys())}")
            token = resp.json().get('token')
            if token:
                print(f"Got Token: {token[:20]}...")
                
                # Now test getting classes with this token
                cls_url = f"{ERP_URL}/api/student-portal/classes"
                print(f"GET {cls_url}")
                
                student_data = resp.json().get('student')
                student_id = student_data.get('_id') if student_data else "69906de6d1378c308e7efe70"
                
                # 1. Just Token
                print("1. Request with Bearer Token only")
                cls_resp = requests.get(cls_url, headers={"Authorization": f"Bearer {token}"})
                print(f"Status: {cls_resp.status_code}")

                # 2. With studentId
                print(f"2. Request with studentId={student_id}")
                cls_resp2 = requests.get(cls_url, 
                                      headers={"Authorization": f"Bearer {token}"},
                                      params={"studentId": student_id})
                print(f"Status: {cls_resp2.status_code}")
                
                if cls_resp2.status_code == 200:
                    print(f"Classes Count: {len(cls_resp2.json())}")
                    if len(cls_resp2.json()) > 0:
                        print(f"Sample: {str(cls_resp2.json()[0])[:200]}")
            break
        else:
            print(f"Failed: {resp.text[:100]}")
            
    except Exception as e:
        print(f"Error: {e}")
