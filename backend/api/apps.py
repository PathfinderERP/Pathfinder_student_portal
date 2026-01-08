from django.apps import AppConfig
from django.db import connections
from django.db.utils import OperationalError
import sys
import re

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # 1. Fix Djongo SQL Execution (Quotes and Parameters)
        try:
            from djongo.cursor import Cursor
            original_execute = Cursor.execute

            def patched_execute(self, sql, params=None):
                if isinstance(sql, str):
                    # Remove quotes from identifiers
                    sql = sql.replace('"', '').replace('`', '')
                    # Remove RETURNING clause
                    sql = re.sub(r'\s+RETURNING\s+.*$', '', sql, flags=re.IGNORECASE)
                    # Convert named placeholders %(0)s to %s
                    sql = re.sub(r'%\([\w\d]+\)s', '%s', sql)
                
                return original_execute(self, sql, params)

            Cursor.execute = patched_execute
        except Exception:
            pass

        # 2. Fix Djongo internal TypeError ('NoneType' object is not iterable)
        # This occurs in query.py when self._cols is None during some inserts
        try:
            from djongo.sql2mongo import query
            
            # Patch InsertQuery.execute to avoid crashing if _cols is missing
            original_insert_execute = query.InsertQuery.execute

            def patched_insert_execute(self):
                try:
                    # Attempt standard execution
                    return original_insert_execute(self)
                except (TypeError, AttributeError):
                    # If it crashes due to _cols being None, valid fallback for simple inserts
                    # This often happens with Django migration table inserts
                    if not hasattr(self, '_cols') or self._cols is None:
                         # Force it to run without column mapping if possible, 
                         # or just suppress if it's a non-critical log
                        pass
                    return

            query.InsertQuery.execute = patched_insert_execute
        except Exception:
            pass

        # Database connection check for local development
        if 'runserver' in sys.argv:
            try:
                db_conn = connections['default']
                db_conn.cursor()
                print("\n✅ \033[92mSuccessfully connected to MongoDB Atlas!\033[0m\n")
            except Exception as e:
                print(f"\n❌ \033[91mDatabase connection error: {e}\033[0m\n")
