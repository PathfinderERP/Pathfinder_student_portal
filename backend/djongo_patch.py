import sys
import re
import logging

# Configure logging to see what's happening
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def apply_djongo_patches():
    """
    Djongo Monkeypatches for Django 4.x + MongoDB Compatibility.
    Fixes the 'RETURNING' clause issue and values being incorrectly parsed as None.
    Also handles UPDATE queries where table alias prefixes cause issues.
    """
    try:
        import djongo.cursor as djongo_cursor
        import djongo.sql2mongo.query as djongo_query
    except ImportError:
        return

    # Store the original execute method if not already stored
    Cursor = djongo_cursor.Cursor
    if not hasattr(Cursor, '_original_execute'):
        Cursor._original_execute = Cursor.execute

    _original_execute = Cursor._original_execute

    def patched_execute(self, sql, params=None):
        if isinstance(sql, str):
            # 1. Basic Cleanup: Remove quotes and backticks
            sql = sql.replace('"', '').replace('`', '')
            
            # 2. Remove RETURNING clause (common in Django 4.x)
            sql = re.sub(r'\s+RETURNING\s+.*$', '', sql, flags=re.IGNORECASE)
            
            # 3. Handle UDPATE queries specifically
            if sql.strip().upper().startswith('UPDATE'):
                # PROBLEM 1: Table Aliasing in WHERE clause
                # Django 4.x: WHERE "api_studytask"."id" = %s
                # Djongo 1.3.6: Expected WHERE "id" = %s
                # Fix: Remove table prefix before .id
                sql = re.sub(r'WHERE\s+[\w\d_]+\.id\s*=', 'WHERE id =', sql, flags=re.IGNORECASE)
                
            # 4. Handle Placeholder Syntax Mismatch
            # Django sometimes generates %(0)s placeholders, but we receive tuple params
            # Convert %(0)s, %(1)s... to %s
            if re.search(r'%\(\d+\)s', sql):
                sql = re.sub(r'%\(\d+\)s', '%s', sql)
                
            # 5. Normalize whitespace
            sql = ' '.join(sql.split())

        # 6. Handle Parameter Nesting Issue
        # Sometimes Django wraps the params tuple inside another tuple (params=((val1, val2...),))
        # But if we converted placeholders to %s, we need a flat tuple: (val1, val2...)
        if params and isinstance(params, (list, tuple)) and len(params) == 1 and isinstance(params[0], (list, tuple)):
            # Check if the inner tuple has multiple items, suggesting it was wrapped
            if len(params[0]) > 1:
                # Unwrap it
                params = params[0]
            
        try:
            return _original_execute(self, sql, params)
        except Exception as e:
            logger.error(f"Djongo Execution Failed: {e}")
            logger.error(f"Failed SQL: {sql}")
            logger.error(f"Params type: {type(params)}")
            logger.error(f"Params: {params}")
            raise e
            
    # Apply the patch
    Cursor.execute = patched_execute
    print("Djongo Cursor patch successfully applied (Aggressive Mode v2)")

    # 2. Patch InsertQuery to correctly extract columns and values
    InsertQuery = djongo_query.InsertQuery
    if not hasattr(InsertQuery, '_is_patched'):
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
        InsertQuery._is_patched = True
        print("Djongo InsertQuery patch successfully applied")

if __name__ == "__main__":
    apply_djongo_patches()
