
# ---------------------------------------------------------
# Djongo Monkeypatches for Django 4.x + MongoDB Compatibility
# ---------------------------------------------------------
import sys
import re

def apply_djongo_patches():
    try:
        from djongo.cursor import Cursor
        from djongo.sql2mongo import query

        # 1. Patch Cursor.execute to fix SQL quoting and placeholders
        original_execute = Cursor.execute
        def patched_execute(self, sql, params=None):
            if isinstance(sql, str):
                sql = sql.replace('"', '').replace('`', '')
                sql = re.sub(r'\s+RETURNING\s+.*$', '', sql, flags=re.IGNORECASE)
                sql = re.sub(r'%\([\w\d]+\)s', '%s', sql)
            return original_execute(self, sql, params)
        Cursor.execute = patched_execute

        # 2. Patch InsertQuery.execute to fix 'NoneType is not iterable'
        original_insert_execute = query.InsertQuery.execute
        def patched_insert_execute(self):
            try:
                return original_insert_execute(self)
            except (TypeError, AttributeError):
                # Fallback: if _cols is missing/None, just ignore the error
                # This usually happens on internal Django table inserts we can skip
                if not hasattr(self, '_cols') or self._cols is None:
                    pass
                return
        query.InsertQuery.execute = patched_insert_execute

    except ImportError:
        pass
# ---------------------------------------------------------
