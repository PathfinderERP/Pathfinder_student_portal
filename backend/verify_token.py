import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rest_framework_simplejwt.tokens import AccessToken

token_str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzcwODA2ODg2LCJpYXQiOjE3NzA4MDMyODYsImp0aSI6IjA5OTMyM2Y2Y2ViMDQwZTBhNWMyYjllZjRmMWU2ZWVmIiwidXNlcl9pZCI6Im1hbGFrc2hhaGlkQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoibWFsYWtzaGFoaWRAZ21haWwuY29tIiwidXNlcl90eXBlIjoic3R1ZGVudCIsInByb2ZpbGVfaW1hZ2UiOm51bGx9.472k_w-hi7sccCVVIbWkT4hQkwn5xZ_1IlEZisWNzv4"

try:
    token = AccessToken(token_str)
    print("Token is valid.")
    print(f"Payload: {token.payload}")
except Exception as e:
    print(f"Token verification failed: {e}")
