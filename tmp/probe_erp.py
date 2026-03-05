import requests

def probe_endpoints():
    erp_url = 'https://pfndrerp.in'
    endpoints = [
        '/api/student-portal/login',
        '/api/teacher-portal/login',
        '/api/employee-portal/login',
        '/api/hr/employee/login',
        '/api/auth/login'
    ]
    
    for ep in endpoints:
        url = f"{erp_url}{ep}"
        try:
            # Just send a dummy POST to see if it responds with 404 or something else (like 401/400)
            resp = requests.post(url, json={}, timeout=10)
            print(f"Endpoint: {ep} | Status: {resp.status_code}")
        except Exception as e:
            print(f"Endpoint: {ep} | Error: {e}")

if __name__ == "__main__":
    probe_endpoints()
