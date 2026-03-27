import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tests.models import Test
from django.db.models import Q

# Check Foundation
q_foundation = Test.objects.filter(Q(allotted_sections__name__iexact='Foundation'))
print(f"Tests matching Foundation ({q_foundation.count()}):")
for t in q_foundation:
    print(f"- {t.id} : {t.name}")
    print(f"  Allotted: {[s.name for s in t.allotted_sections.all()]}")
