import requests
import json

def inspect_full_data():
    erp_url = 'https://pfndrerp.in'
    login_resp = requests.post(f"{erp_url}/api/superAdmin/login", json={"email": "atanu@gmail.com", "password": "000000"}, timeout=30)
    token = login_resp.json().get('token')
    headers = {"Authorization": f"Bearer {token}"}
    
    url = f"{erp_url}/api/hr/employee?limit=1000"
    resp = requests.get(url, headers=headers, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        employees = data.get('employees', [])
        
        found_count = 0
        for e in employees:
            # Check if this is the teacher the user mentioned earlier or just sample
            is_target = e.get('name') == "ABHASH SIKDAR"
            if is_target or found_count < 3:
                # Key check: where is 'subject'?
                print(f"--- Record for {e.get('name')} ---")
                print(json.dumps(e, indent=2))
                if is_target: break
                found_count += 1

if __name__ == "__main__":
    inspect_full_data()
