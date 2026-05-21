import os
import django
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.test import RequestFactory
from django.db import connection, reset_queries
from tests.views import TestViewSet

User = get_user_model()
# Find a student who has a centre populated
student = User.objects.filter(user_type='student').exclude(centre_code=None).exclude(centre_code='').first()

if not student:
    # Try getting any student who has centre name
    student = User.objects.filter(user_type='student').exclude(centre_name=None).exclude(centre_name='').first()

if not student:
    # Fallback to first student
    student = User.objects.filter(user_type='student').first()

if not student:
    print("No student found!")
    exit(1)

print(f"Profiling tests for student: {student.username} (email: {student.email})")
print(f"centre_code: {student.centre_code}, centre_name: {student.centre_name}")

factory = RequestFactory()
request = factory.get('/api/tests/')
request.user = student

view = TestViewSet.as_view({'get': 'list'})

reset_queries()
start_time = time.time()
response = view(request)
end_time = time.time()

print(f"Response status: {response.status_code}")
print(f"Time taken: {end_time - start_time:.4f} seconds")
print(f"Number of SQL queries: {len(connection.queries)}")

# Print first 30 queries
for idx, q in enumerate(connection.queries[:30]):
    print(f"{idx+1}: Time: {q['time']} | SQL: {q['sql'][:200]}...")
