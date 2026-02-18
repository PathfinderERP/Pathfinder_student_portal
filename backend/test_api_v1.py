import requests
import json

# Configuration
NEW_CLIENT_KEY = "EaAd/sX8jsj7Gt0Vt+lvBw=="
TEST_EMAIL = "student@pathfinder.com"
# Testing on the primary API domain since sapi failed GetToken
BASE_URL = "https://api.scholarlab.in"

def test_flow():
    print(f"--- Testing New Client Key on {BASE_URL} ---")
    
    # 1. Get Token
    print("\n[Step 1] GetToken")
    token_url = f"{BASE_URL}/ClientSimulations/GetToken"
    try:
        resp = requests.get(token_url, params={"client_Key": NEW_CLIENT_KEY}, timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            token = resp.json().get('token')
            print("Token received.")
        else:
            print(f"Failed: {resp.text}")
            return
    except Exception as e:
        print(f"Error: {e}")
        return

    # 2. Users Grade Mapping
    print("\n[Step 2] UsersGradeMapping")
    mapping_url = f"{BASE_URL}/ClientSimulations/UsersGradeMapping"
    payload = {
        "token": token,
        "SchoolUserUploads": [{
            "UserName": "Test Student",
            "EmailId": TEST_EMAIL,
            "Subject": "All",
            "Grades": "9"
        }]
    }
    try:
        resp = requests.post(mapping_url, json=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

    # 3. Get Simulations
    print("\n[Step 3] GetSimulationsWithGrades")
    sim_url = f"{BASE_URL}/ClientSimulations/GetSimulationsWithGrades"
    try:
        resp = requests.post(sim_url, json={"token": token, "userName": TEST_EMAIL}, timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            sims = resp.json()
            print(f"Success! Found {len(sims)} simulations.")
            if len(sims) > 0:
                print(f"Sample: {sims[0].get('Module')}")
        else:
            print(f"Failed: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_flow()
