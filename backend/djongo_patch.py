import sys
import re
import importlib

def apply_djongo_patches():
    """
    Djongo Monkeypatches for Django 4.x + MongoDB Compatibility.
    Fixes the 'RETURNING' clause issue and values being incorrectly parsed as None.
    """
    try:
        # Avoid circular imports by using importlib or delayed imports
        try:
            import djongo.cursor as djongo_cursor
            import djongo.sql2mongo.query as djongo_query
        except ImportError:
            # Fallback if the above fails during initialization
            return

        # 1. Patch Cursor.execute to remove RETURNING and fix quotes
        Cursor = djongo_cursor.Cursor
        if not hasattr(Cursor, '_is_patched'):
            _original_execute = Cursor.execute
            def patched_execute(self, sql, params=None):
                if isinstance(sql, str):
                    # Remove quotes that Djongo's parser chokes on
                    sql = sql.replace('"', '').replace('`', '')
                    # Remove RETURNING clause which MongoDB doesn't support via Djongo
                    sql = re.sub(r'\s+RETURNING\s+.*$', '', sql, flags=re.IGNORECASE)
                    # Support both %s and %(name)s
                    sql = re.sub(r'%\([\w\d]+\)s', '%s', sql)
                    # Normalize whitespace
                    sql = ' '.join(sql.split())
                    
                return _original_execute(self, sql, params)
            
            Cursor.execute = patched_execute
            Cursor._is_patched = True
            print("Djongo Cursor patch successfully applied")

        # 2. Patch InsertQuery to correctly extract columns and values
        InsertQuery = djongo_query.InsertQuery
        
        def robust_columns(self, statement):
            stmt_str = str(statement)
            match = re.search(r'INSERT INTO .*?\((.*?)\)', stmt_str, re.IGNORECASE)
            if match:
                self._cols = [c.strip().replace('"', '').replace('`', '') for c in match.group(1).split(',')]
            else:
                self._cols = []

        def robust_values(self, statement):
            stmt_str = str(statement)
            match = re.search(r'VALUES\s*\((.*?)\)', stmt_str, re.IGNORECASE | re.DOTALL)
            if match:
                vals = [v.strip() for v in match.group(1).split(',')]
                self._values = vals
            else:
                self._values = ['%s'] * len(getattr(self, '_cols', []))

        InsertQuery._columns = robust_columns
        InsertQuery._values = robust_values
        print("Djongo InsertQuery patch successfully applied")

    except Exception as e:
        print(f"Djongo patch fallback/failed: {type(e).__name__}: {e}")

if __name__ == "__main__":
    apply_djongo_patches()
