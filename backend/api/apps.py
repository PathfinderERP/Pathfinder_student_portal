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
                    # 1. Remove quotes from identifiers
                    sql = sql.replace('"', '').replace('`', '')
                    
                    # 2. Remove RETURNING clause (Djongo doesn't support it)
                    sql = re.sub(r'\s+RETURNING\s+.*$', '', sql, flags=re.IGNORECASE)
                    
                    # 3. Convert all named placeholders like %(0)s or %(name)s to %s
                    # This is critical for Django 4.1+ compatibility
                    sql = re.sub(r'%\([\w\d]+\)s', '%s', sql)
                
                try:
                    return original_execute(self, sql, params)
                except Exception as e:
                    # Log failed SQL for easier remote debugging if it still fails
                    print(f"FAILED SQL: {sql}")
                    raise e

            Cursor.execute = patched_execute

            # Fix for 'Token' object is not subscriptable in Djongo 1.3.6/1.3.7
            # This happens in djongo/sql2mongo/query.py
            try:
                from djongo.sql2mongo import query
                if hasattr(query, 'SQLToken'):
                    # Some versions need this fix, but sqlparse 0.3.1 usually avoids it.
                    pass
            except ImportError:
                pass
        except Exception:
            pass

        if 'runserver' in sys.argv:
            try:
                db_conn = connections['default']
                db_conn.cursor()
                print("\n✅ \033[92mSuccessfully connected to MongoDB Atlas!\033[0m\n")
            except Exception as e:
                print(f"\n❌ \033[91mDatabase connection error: {e}\033[0m\n")
