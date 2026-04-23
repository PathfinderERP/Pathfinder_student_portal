import os
import sys
import django

sys.path.append(r"A:\Pathfinder_student_portal\backend")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings
settings.DEBUG = True

from django.db import connection
from master_data.views import ChapterViewSet
from django.test import RequestFactory
from django.core.cache import cache

cache.clear()
ChapterViewSet._local_cache.clear()

factory = RequestFactory()
request = factory.get('/api/master-data/chapters/?refresh=true')
view = ChapterViewSet.as_view({'get': 'list'})

import time
start = time.time()
response = view(request)
response.render()
end = time.time()

print(f"Time taken: {end - start} seconds")
print(f"Number of queries: {len(connection.queries)}")
for q in connection.queries:
    print(q['time'], q['sql'][:100])
