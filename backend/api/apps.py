from django.apps import AppConfig
from django.db import connections
from django.db.utils import OperationalError
import sys
import re

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Database connection check for local development
        if 'runserver' in sys.argv:
            try:
                db_conn = connections['default']
                db_conn.cursor()
                print("\n[OK] Successfully connected to MongoDB Atlas!\n")
            except Exception as e:
                print(f"\n[ERROR] Database connection error: {e}\n")
