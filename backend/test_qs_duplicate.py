import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.views import TestViewSet
from api.models import CustomUser
from rest_framework.request import Request
from django.test import RequestFactory

user = CustomUser.objects.filter(email='fortwilliam1@gmail.com').first()
factory = RequestFactory()
wsgi_request = factory.get('/api/tests/')
wsgi_request.user = user
request = Request(wsgi_request)

view = TestViewSet()
view.request = request
view.format_kwarg = None

qs = view.get_queryset()
print("Total tests returned:", qs.count())
for t in qs:
    print(f"- {t.id} : {t.name}")

# Also test manual list
all_tests = list(qs)
print("Total tests evaluated:", len(all_tests))
for t in all_tests:
    print(f"* {t.id} : {t.name}")
