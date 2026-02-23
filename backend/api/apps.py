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
        if 'runserver' in sys.argv:
            try:
                # We need to make sure the patch above didn't break things
                db_conn = connections['default']
                db_conn.cursor()
                print("\n[OK] Successfully connected to MongoDB Atlas!\n")
            except Exception as e:
                print(f"\n[ERROR] Database connection error: {e}\n")
