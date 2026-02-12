import sys
import re
import logging

# Configure logging to see what's happening
logging.basicConfig(level=logging.ERROR) # Changed to ERROR to reduce noise, but ensure errors are seen
logger = logging.getLogger(__name__)

def apply_djongo_patches():
    """
    Djongo Monkeypatches for Django 4.x + MongoDB Compatibility.
    """
    try:
        import djongo.cursor as djongo_cursor
        import djongo.sql2mongo.query as djongo_query
    except ImportError:
        return

    # Store the original execute method
    Cursor = djongo_cursor.Cursor
    if not hasattr(Cursor, '_original_execute'):
        Cursor._original_execute = Cursor.execute

    _original_execute = Cursor._original_execute

    def patched_execute(self, sql, params=None):
        # 0. Tuple Unwrapping for SQL
        # Sometimes Django/Djongo/Wrappers pass SQL as a single-item tuple ('UPDATE...', )
        if isinstance(sql, (list, tuple)) and len(sql) > 0:
            # logger.warning(f"SQL passed as tuple/list: {type(sql)}")
            sql = sql[0] # Unwrap it

        if isinstance(sql, str):
            # 1. Basic Cleanup
            sql = sql.replace('"', '').replace('`', '')
            sql = re.sub(r'\s+RETURNING\s+.*$', '', sql, flags=re.IGNORECASE)
            
            # 3. Handle UPDATE queries
            if sql.strip().upper().startswith('UPDATE'):
                # Strip table aliases in WHERE: WHERE api_studytask.id = ... -> WHERE id = ...
                sql = re.sub(r'WHERE\s+[\w\d_]+\.id\s*=', 'WHERE id =', sql, flags=re.IGNORECASE)

            # 4. Handle Placeholder Syntax Mismatch (%(0)s -> %s)
            has_named_placeholders = bool(re.search(r'%\(\d+\)s', sql))
            if has_named_placeholders:
                sql = re.sub(r'%\(\d+\)s', '%s', sql)

            # 5. Normalize whitespace
            sql = ' '.join(sql.split())

        # 6. Handle Parameter Nesting
        # Un-nest params if they are wrapped in an extra tuple: ((a,b,c),) -> (a,b,c)
        if params and isinstance(params, (list, tuple)) and len(params) == 1:
            first_item = params[0]
            if isinstance(first_item, (list, tuple)):
                # It's an inner sequence. Use it as params.
                params = first_item
        
        try:
            return _original_execute(self, sql, params)
        except Exception as e:
            # Explicitly print to stderr because logger might be configured weirdly in Django
            # err_msg = f"\n[DJONGO PATCH ERROR]\nSQL: {sql}\nParams: {params}\nError: {e}\n"
            # sys.stderr.write(err_msg)
            
            # Still raise it so Django knows something failed
            raise e
            
    Cursor.execute = patched_execute
    print("Djongo Cursor patch successfully applied (Tuple Fix v4)")

    # Patch InsertQuery
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
