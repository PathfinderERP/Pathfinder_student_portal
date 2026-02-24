import sys
import re
import logging

logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)

def apply_djongo_patches():
    """
    Djongo Universal Adapter for Django 4.x + MongoDB.
    This patch bridges the syntax gap between modern Django (4.1+) and Djongo.
    """
    try:
        from djongo import cursor as djongo_cursor
        from djongo.sql2mongo import query as djongo_query
    except ImportError as e:
        print(f"!!! Djongo patch Import Error: {e} !!!")
        return

    Cursor = djongo_cursor.Cursor
    if not hasattr(Cursor, '_original_execute'):
        Cursor._original_execute = Cursor.execute

    def patched_execute(self, sql, params=None):
        # 1. Handle Tuple/List SQL
        if isinstance(sql, (list, tuple)) and len(sql) > 0:
            sql = sql[0]

        if not isinstance(sql, str):
            return Cursor._original_execute(self, sql, params)

        # 2. Universal SQL Sanitization
        sql_upper = sql.strip().upper()
        
        # A. Suppress Transaction & System commands
        if any(sql_upper.startswith(cmd) for cmd in [
            'SAVEPOINT', 'RELEASE SAVEPOINT', 'ROLLBACK TO SAVEPOINT', 
            'BEGIN', 'COMMIT', 'ROLLBACK', 'SET SEARCH_PATH', 'SET TIME ZONE'
        ]):
            return

        # B. Fix Placeholder Syntax: %(0)s -> %s
        sql = re.sub(r'%\(\d+\)s', '%s', sql)

        # C. Remove RETURNING clause
        sql = re.sub(r'\s+RETURNING\s+.*$', '', sql, flags=re.IGNORECASE)

        # D. Fix Table Aliases in UPDATE/DELETE (Django 4.x specific)
        # Changes "WHERE table_name.id = %s" to "WHERE id = %s"
        sql = re.sub(r'WHERE\s+[\w\d_"]+\.id\s*=', 'WHERE id =', sql, flags=re.IGNORECASE)
        sql = re.sub(r'WHERE\s+[\w\d_"]+\."?user_ptr_id"?\s*=', 'WHERE user_ptr_id =', sql, flags=re.IGNORECASE)

        # E. Boolean Handling (Bare Columns)
        keywords = r'(?:NOT|EXISTS|TRUE|FALSE|NULL|SELECT|FROM|WHERE|AND|OR|ORDER|LIMIT|GROUP|BY|IN|IS)'
        col_pat  = r'("?[\w\d._]+"?(?:\."?[\w\d._]+"?)?)'
        neg_op   = r'(?!\s*(?:=|<|>|!|IS|IN))'
        pos_term = r'(?=\s*(?:AND|OR|ORDER|LIMIT|GROUP|BY|\)|,|\s*$))'
        
        new_params = list(params) if params else []

        def replace_bare(match):
            prefix, col = match.group(1), match.group(2)
            if re.match('^' + keywords + '$', col, re.IGNORECASE):
                return match.group(0)
            new_params.append(True)
            return f"{prefix}{col} = %s"

        # Match bare booleans in WHERE/AND/OR
        sql = re.sub(r'(\b(?:WHERE|AND|OR)\b\s+)' + col_pat + neg_op + pos_term, replace_bare, sql, flags=re.IGNORECASE)
        # Match bare booleans in nested parens
        sql = re.sub(r'((?:\b(?:WHERE|AND|OR|NOT|ON)\b|\()\s*\(\s*)' + col_pat + neg_op + pos_term, replace_bare, sql, flags=re.IGNORECASE)

        if new_params:
            params = tuple(new_params)

        # 3. Execution with Ultimate Safety Net
        try:
            # Unwrap nested params
            if params and len(params) == 1 and isinstance(params[0], (list, tuple)):
                params = params[0]
            
            return Cursor._original_execute(self, sql, params)
        except Exception as e:
            err_msg = str(e)
            # If it's a known non-critical decode error, ignore it
            if any(x in err_msg for x in ["SQLDecodeError", "command not implemented"]):
                if not sql_upper.startswith(('SELECT', 'INSERT', 'UPDATE', 'DELETE')):
                    print(f"[PATCH] Ignored background SQL error: {err_msg[:50]}")
                    return
            
            # log for debugging
            logger.debug(f"Djongo Error. SQL: {sql} | Params: {params}")
            raise e

    Cursor.execute = patched_execute

    # 4. Patch InsertQuery (Fixes the "Token object is not subscriptable" bug)
    InsertQuery = djongo_query.InsertQuery
    if not hasattr(InsertQuery, '_is_patched'):
        def robust_columns(self, statement):
            stmt_str = str(self.statement)
            match = re.search(r'INSERT INTO .*?\((.*?)\)', stmt_str, re.IGNORECASE)
            self._cols = [c.strip().replace('"', '').replace('`', '') for c in match.group(1).split(',')] if match else []

        def robust_fill_values(self, statement):
            stmt_str = str(self.statement)
            v_match = re.search(r'VALUES\s*(.*)$', stmt_str, re.IGNORECASE | re.DOTALL)
            if not v_match:
                self._values = []
                return

            row_matches = re.findall(r'\((.*?)\)', v_match.group(1), re.DOTALL)
            all_rows = []
            for row_str in row_matches:
               placeholders = [p.strip() for p in row_str.split(',')]
               row_values = []
               for p in placeholders:
                   idx_match = re.search(r'%\((\d+)\)s', p)
                   if idx_match:
                       idx = int(idx_match.group(1))
                       row_values.append(self.params[idx] if idx < len(self.params) else None)
                   elif p == '%s':
                       idx = len(row_values)
                       row_values.append(self.params[idx] if idx < len(self.params) else None)
                   elif p.upper() == 'NULL': row_values.append(None)
                   elif (p.startswith("'") and p.endswith("'")): row_values.append(p[1:-1])
                   else: row_values.append(p)
               all_rows.append(row_values)
            self._values = all_rows

        InsertQuery._columns = robust_columns
        InsertQuery._fill_values = robust_fill_values
        InsertQuery._is_patched = True

    # 5. Patch DRF JSONEncoder for ObjectId support
    try:
        from rest_framework.utils import encoders
        from bson import ObjectId
        if not hasattr(encoders.JSONEncoder, '_is_patched'):
            original_default = encoders.JSONEncoder.default
            def patched_default(self, obj):
                if isinstance(obj, ObjectId): return str(obj)
                return original_default(self, obj)
            encoders.JSONEncoder.default = patched_default
            encoders.JSONEncoder._is_patched = True
    except ImportError: pass

    print("Djongo patches successfully initialized.")

if __name__ == "__main__":
    apply_djongo_patches()

