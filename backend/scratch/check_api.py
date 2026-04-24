import requests
import json

url = "http://localhost:8000/api/tests/"
# Need a token. I'll try to get it from somewhere or just see if it gives 500 even without auth (should give 401/403)
# But if it gives 500, then it's a code issue.

try:
    # Try with a fake token just to see if it triggers the queryset logic
    headers = {"Authorization": "Bearer fake_token"}
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 500:
        print("Response Content:")
        print(response.text[:1000])
except Exception as e:
    print(f"Error: {e}")
