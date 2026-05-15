import os
import django
from bson import ObjectId

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
sid = "6a057468d23ca10f7bdde0af"

print(f"Searching for PK as string: {sid}")
u1 = User.objects.filter(pk=sid).first()
print(f"Result 1: {u1}")

print(f"Searching for PK as ObjectId: {sid}")
u2 = User.objects.filter(pk=ObjectId(sid)).first()
print(f"Result 2: {u2}")

print(f"Searching for _id as string: {sid}")
u3 = User.objects.filter(id=sid).first()
print(f"Result 3: {u3}")
