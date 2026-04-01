import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test, TestCentreAllotment

for t in Test.objects.all():
    allotments = TestCentreAllotment.objects.filter(test=t)
    is_over = True if allotments.exists() else False
    latest_end = None
    for a in allotments:
        if not a.end_time or a.end_time > timezone.now():
            is_over = False
        if a.end_time:
            if not latest_end or a.end_time > latest_end:
                latest_end = a.end_time
    print(f"ID:{t.id} Name:{t.name} AllOver:{is_over} LatestEnd:{latest_end}")
