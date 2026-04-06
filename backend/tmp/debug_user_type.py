import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser

admin_user = CustomUser.objects.filter(username__icontains='admin').first()
if admin_user:
    print(f"ORM username: {admin_user.username}")
    print(f"ORM user_type: {admin_user.user_type}")
    
    # Let's see if we can read it from the underlying document if it's a djongo mess
    from api.db_utils import get_db
    db = get_db()
    if db is not None:
        raw = db['api_customuser'].find_one({'username': admin_user.username})
        if raw:
            print(f"Mongo user_type: {raw.get('user_type')}")
        else:
            print("Mongo raw find failed")
else:
    print("User not found")
