import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
tests = Test.objects.all()

for t in tests:
    print(f"{t.name} -> {t.total_marks}")

