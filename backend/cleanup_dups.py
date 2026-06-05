import os
import sys

sys.path.append('a:\\Pathfinder_student_portal\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from api.models import CustomUser

all_users = CustomUser.objects.all()
username_counts = {}

for u in all_users:
    username = u.username
    if username not in username_counts:
        username_counts[username] = []
    username_counts[username].append(u)

duplicates = {k: v for k, v in username_counts.items() if len(v) > 1}

print(f"Found {len(duplicates)} duplicate usernames.")

for username, users in duplicates.items():
    if not username: continue
    
    print(f"Cleaning up {len(users)} duplicates for {username}...")
    
    # Sort by date joined if possible, or just keep the first one with admission_number
    keep_user = None
    for u in users:
        if u.admission_number:
            keep_user = u
            break
            
    if not keep_user:
        keep_user = users[0]
        
    for u in users:
        if u._id != keep_user._id:
            print(f"Deleting duplicate {u._id} for {username}")
            u.delete()
            
print("Cleanup complete!")
