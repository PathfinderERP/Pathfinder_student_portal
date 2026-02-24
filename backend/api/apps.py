from django.apps import AppConfig
from django.db import connections
from django.db.utils import OperationalError
import sys
import re

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Apply Djongo patches
        try:
            from djongo_patch import apply_djongo_patches
            apply_djongo_patches()
            print("[PATCH] Djongo cursor patches applied in api.apps.ready()")
        except Exception as e:
            print(f"[PATCH ERROR] Failed to apply Djongo patches: {e}")

        # Database connection check for local development
        if 'runserver' in sys.argv or 'gunicorn' in sys.argv:
            try:
                # We need to make sure the patch above didn't break things
                db_conn = connections['default']
                db_conn.cursor()
                print("\n[OK] Successfully connected to MongoDB Atlas!\n")
                
                # Proactive self-healing: Fix MultipleObjectsReturned by deduplicating usernames
                self.proactive_user_cleanup()
            except Exception as e:
                print(f"\n[ERROR] Database connection/startup error: {e}\n")

    def proactive_user_cleanup(self):
        """Deduplicates usernames to prevent JWT login crashes."""
        try:
            from .models import CustomUser
            from collections import Counter
            
            # Use filter().all() to avoid any potential MultipleObjectsReturned during the lookup itself
            # Though .all() is safe.
            print("[CLEANUP] Checking for duplicate users...")
            all_usernames = list(CustomUser.objects.values_list('username', flat=True))
            counts = Counter(all_usernames)
            duplicates = [name for name, count in counts.items() if count > 1 and name]
            
            if duplicates:
                print(f"[CLEANUP] Found {len(duplicates)} duplicate usernames. Resolving...")
                for username in duplicates:
                    # Keep only the one with the highest PK (most recent)
                    user_list = list(CustomUser.objects.filter(username=username).order_by('-pk'))
                    keep = user_list[0]
                    waste = user_list[1:]
                    for dupe in waste:
                        print(f"  [CLEANUP] Deleting duplicate user: {username} (ID: {dupe.pk})")
                        dupe.delete()
                print("[CLEANUP] Deduplication finished.")
            else:
                print("[CLEANUP] No duplicate users found.")
        except Exception as e:
            print(f"[CLEANUP ERROR] Proactive cleanup failed: {e}")
