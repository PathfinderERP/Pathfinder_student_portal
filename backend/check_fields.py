import os
import django
from django.forms.models import model_to_dict

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test

print("Details for Test ID 1:")
t = Test.objects.filter(id=1).first()
if t:
    d = model_to_dict(t)
    for k, v in d.items():
        print(f"{k}: {v} ({type(v)})")
else:
    print("Test ID 1 not found")
