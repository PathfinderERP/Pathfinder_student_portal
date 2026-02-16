import requests
import json
import os

ERP_URL = os.getenv('ERP_API_URL', 'https://pfndrerp.in')
ERP_EMAIL = os.getenv('ERP_ADMIN_EMAIL', 'atanu@gmail.com')
ERP_PASSWORD = os.getenv('ERP_ADMIN_PASSWORD', '000000')

print(f"Probing Admin Classes...")

try:
    # Login
    login_url = f"{ERP_URL}/api/superAdmin/login"
    payload = {"email": ERP_EMAIL, "password": ERP_PASSWORD}
    response = requests.post(login_url, json=payload, timeout=10)
    token = response.json().get('token')
    headers = {"Authorization": f"Bearer {token}"}

    endpoints = [
        "/api/academics/classes",
        "/api/academics/all-classes",
        "/api/academics/upcomingClass", # Retry
        "/api/academics/ongoingClass",
        "/api/academics/previousClass",
        "/api/class/all",
        "/api/masterData/class"
    ]
    
    for ep in endpoints:
        url = f"{ERP_URL}{ep}"
        print(f"GET {url}")
        resp = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                print(f"Count: {len(data)}")
                if len(data) > 0:
                    print(f"Sample: {str(data[0])[:100]}")
            else:
                 print("Not a list.")

except Exception as e:
    print(e)
