import os
import django
import sys
from collections import Counter

# Setting up Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser

def cleanup_duplicate_users():
    print("Checking for duplicate users...")
    all_users = list(CustomUser.objects.all())
    usernames = [u.username for u in all_users]
    counts = Counter(usernames)
    
    duplicates = [name for name, count in counts.items() if count > 1]
    
    if not duplicates:
        print("No duplicate usernames found.")
        return

    print(f"Found {len(duplicates)} duplicate usernames.")
    
    for username in duplicates:
        print(f"Cleaning up duplicates for: {username}")
        # Keep the first one created (or just the first one returned)
        user_list = list(CustomUser.objects.filter(username=username).order_by('pk'))
        keep_user = user_list[0]
        delete_users = user_list[1:]
        
        print(f"  Keeping user ID: {keep_user.pk}")
        for dupe in delete_users:
            print(f"  Deleting duplicate ID: {dupe.pk}")
            dupe.delete()
            
    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_duplicate_users()
