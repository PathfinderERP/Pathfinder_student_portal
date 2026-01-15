import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from tests.serializers import TestSerializer

try:
    test = Test.objects.get(id=1)
    serializer = TestSerializer(test)
    print("Serialized Test ID 1:")
    for k, v in serializer.data.items():
        print(f"{k}: {v}")
except Exception as e:
    print(f"Error: {e}")
