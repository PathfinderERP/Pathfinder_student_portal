from django.apps import AppConfig
from django.db import connections
from django.db.utils import OperationalError
import sys

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Fix Djongo compatibility with Django 4.0+ / 5.0 / 6.0
        try:
            from djongo.cursor import Cursor
            import re
            original_execute = Cursor.execute

            def patched_execute(self, sql, params=None):
                if isinstance(sql, str):
                    # 1. Remove quotes
                    sql = sql.replace('"', '').replace('`', '')
                    
                    # 2. Remove RETURNING clause
                    sql = re.sub(r'\s+RETURNING\s+.*$', '', sql, flags=re.IGNORECASE)
                    
                    # 3. Convert %(name)s to %s for Djongo
                    if '%(' in sql:
                        sql = re.sub(r'%\(\w+\)s', '%s', sql)
                
                return original_execute(self, sql, params)

            Cursor.execute = patched_execute
        except Exception:
            pass

        if 'runserver' in sys.argv:
            try:
                db_conn = connections['default']
                db_conn.cursor()
                print("\n✅ \033[92mSuccessfully connected to MongoDB Atlas!\033[0m\n")
            except Exception as e:
                print(f"\n❌ \033[91mDatabase connection error: {e}\033[0m\n")
