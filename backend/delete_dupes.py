import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from bson import ObjectId
from api.models import CustomUser
from api.db_utils import get_db

u = CustomUser.objects.filter(first_name__icontains='Debraj').first()
if not u:
    print("User not found")
    exit()

user_id = ObjectId(u.pk)
db = get_db()
coll = db['api_studentstudyplannerconfig']

docs = list(coll.find({'user_id': user_id}).sort('updated_at', -1))
print(f"Found {len(docs)} documents for {u.first_name}")

if len(docs) > 1:
    to_delete = [d['_id'] for d in docs[1:]]
    coll.delete_many({'_id': {'$in': to_delete}})
    print(f"Deleted {len(to_delete)} duplicate documents")
else:
    print("No duplicates to delete")
