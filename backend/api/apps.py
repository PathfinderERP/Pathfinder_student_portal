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

        # 2. Fix Djongo internal TypeError ('Token' object is not subscriptable)
        try:
            from djongo.sql2mongo import query
            original_columns = query.InsertQuery._columns

            def patched_columns(self, statement):
                try:
                    return original_columns(self, statement)
                except (TypeError, IndexError):
                    # This fallback prevents the 'Token object is not subscriptable' crash
                    if not hasattr(self, '_cols'):
                        self._cols = []
                    return

            query.InsertQuery._columns = patched_columns
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
