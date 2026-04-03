import os
import django
import time

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.test import Client
from rest_framework.test import APIClient

from api.models import CustomUser
from tests.models import Test

student = CustomUser.objects.filter(user_type='student').first()
test = Test.objects.first()

if not student or not test:
    print("No student or test found.")
    exit(1)

client = APIClient()
client.force_authenticate(user=student)

print(f"Testing for Student: {student.username}, Test ID: {test.pk}")

# 1. Status Check
start = time.time()
res1 = client.get(f'/api/tests/{test.pk}/status/')
t1 = time.time() - start
print(f"1. Status API: {t1:.4f} seconds (Status: {res1.status_code})")

# 2. Question Paper 
start = time.time()
res2 = client.get(f'/api/tests/{test.pk}/question_paper/')
t2 = time.time() - start
print(f"2. Question Paper API (First load): {t2:.4f} seconds (Status: {res2.status_code})")
print(f"Number of sections: {len(res2.json().get('sections', []))}")
if res2.json().get('sections'):
    print(f"Number of questions in first section: {len(res2.json()['sections'][0].get('questions_detail', []))}")

# Test Cache hit
start = time.time()
res3 = client.get(f'/api/tests/{test.pk}/question_paper/')
t3 = time.time() - start
print(f" - Question Paper API (Cached hit): {t3:.4f} seconds (Status: {res3.status_code})")

# 3. ERP Data
start = time.time()
res4 = client.get('/api/student/erp-data/')
t4 = time.time() - start
print(f"3. ERP Data API: {t4:.4f} seconds (Status: {res4.status_code})")

print(f"Total simulated sequential time: {t1+t2+t4:.4f} seconds")
