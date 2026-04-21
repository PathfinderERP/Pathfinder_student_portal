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
        from sqlparse import parse as sql_parse_lib
        from sqlparse import tokens as sql_tokens_lib
        from sqlparse.sql import Parenthesis, Identifier
        from djongo.exceptions import SQLDecodeError
        import csv
        import io
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
        # We transform to %s but InsertQuery patch must handle it
        sql = re.sub(r'%\(\d+\)s', '%s', sql)

        # C. Remove RETURNING clause (Djongo doesn't support it)
        sql = re.sub(r'\s+RETURNING\s+.*$', '', sql, flags=re.IGNORECASE)

        # D. Fix Table Aliases (Django 4.x)
        sql = re.sub(r'WHERE\s+[\w\d_"]+\.id\s*=', 'WHERE id =', sql, flags=re.IGNORECASE)

        # E. Boolean Handling
        keywords = r'(?:NOT|EXISTS|TRUE|FALSE|NULL|SELECT|FROM|WHERE|AND|OR|ORDER|LIMIT|GROUP|BY|IN|IS)'
        col_pat  = r'("?[\w\d._]+"?(?:\."?[\w\d._]+"?)?)'
        neg_op   = r'(?!\s*(?:=|<|>|!|IS|IN))'
        pos_term = r'(?=\s*(?:AND|OR|ORDER|LIMIT|GROUP|BY|\)|,|\s*$))'
        
        new_params = list(params) if params else []
        initial_params_len = len(new_params)

        def replace_bare(match):
            prefix, col = match.group(1), match.group(2)
            if re.match('^' + keywords + '$', col, re.IGNORECASE):
                return match.group(0)
            new_params.append(True)
            return f"{prefix}{col} = %s"

        sql = re.sub(r'(\b(?:WHERE|AND|OR)\b\s+)' + col_pat + neg_op + pos_term, replace_bare, sql, flags=re.IGNORECASE)
        sql = re.sub(r'((?:\b(?:WHERE|AND|OR|NOT|ON)\b|\()\s*\(\s*)' + col_pat + neg_op + pos_term, replace_bare, sql, flags=re.IGNORECASE)

        if len(new_params) > initial_params_len:
            params = tuple(new_params)

        try:
            # Flatten params if necessary for executemany style or single-list-in-tuple
            if params and len(params) == 1 and isinstance(params[0], (list, tuple)) and sql.count('%s') > 1:
                 params = params[0]
            
            return Cursor._original_execute(self, sql, params)
        except Exception as e:
            if any(x in str(e) for x in ["SQLDecodeError", "command not implemented"]):
                if not sql_upper.startswith(('SELECT', 'INSERT', 'UPDATE', 'DELETE')):
                    return
            raise e

    Cursor.execute = patched_execute

    # 4. Patch InsertQuery (Complete Overhaul)
    InsertQuery = djongo_query.InsertQuery
    def patched_insert_parse(self):
        stmt_str = str(self.statement)
        try:
            parsed = sql_parse_lib(stmt_str)[0]
        except Exception as e:
            raise SQLDecodeError(str(e))

        # 1. Extract Table Name
        self.left_table = None
        for tok in parsed.tokens:
            if isinstance(tok, Identifier):
                self.left_table = tok.get_real_name()
                break
        
        if not self.left_table:
            table_match = re.search(r'INSERT INTO\s+["`]?([\w\d._]+)["`]?\s*', stmt_str, re.IGNORECASE)
            if table_match: self.left_table = table_match.group(1).strip('"').strip('`')

        if not self.left_table:
            raise SQLDecodeError("Could not parse Table name")

        if self.left_table not in self.connection_properties.cached_collections:
            self.connection_properties.cached_collections.add(self.left_table)

        # 2. Extract Columns and Values
        self._cols = []
        self._values = []
        found_values_kw = False
        
        for tok in parsed.tokens:
            if isinstance(tok, Parenthesis) and not self._cols and not found_values_kw:
                inner = tok.value.strip('()')
                self._cols = [c.strip().strip('"').strip('`') for c in inner.split(',')]
            
            elif tok.match(sql_tokens_lib.Keyword, 'VALUES'):
                found_values_kw = True
            
            elif isinstance(tok, Parenthesis) and found_values_kw:
                inner = tok.value.strip('()')
                import csv, io
                reader = csv.reader(io.StringIO(inner), quotechar="'", skipinitialspace=True)
                placeholders = [p.strip() for row in reader for p in row]
                
                row_values = []
                curr_params = list(self.params) if self.params else []
                if len(curr_params) == 1 and isinstance(curr_params[0], (list, tuple)):
                    curr_params = list(curr_params[0])
                
                param_idx = 0
                for p in placeholders:
                    # Match %(digit)s
                    idx_m = re.search(r'%\((\d+)\)s', p)
                    if idx_m:
                        idx = int(idx_m.group(1))
                        row_values.append(curr_params[idx] if idx < len(curr_params) else None)
                    # Match %s or ?
                    elif p == '%s' or p == '?':
                        row_values.append(curr_params[param_idx] if param_idx < len(curr_params) else None)
                        param_idx += 1
                    # Handle Literals
                    elif p.upper() == 'NULL': row_values.append(None)
                    elif p.startswith("'") and p.endswith("'"): row_values.append(p[1:-1])
                    elif p.startswith('"') and p.endswith('"'): row_values.append(p[1:-1])
                    elif p.replace('.','',1).isdigit():
                        if '.' in p: row_values.append(float(p))
                        else: row_values.append(int(p))
                    else: row_values.append(p)
                
                self._values.append(row_values)

    InsertQuery.parse = patched_insert_parse

    # 5. Patch Query.parse
    Query = djongo_query.Query
    original_parse = Query.parse
    def patched_parse(self):
        try:
            return original_parse(self)
        except Exception as e:
            raise e
    Query.parse = patched_parse

    # 6. Patch DRF JSONEncoder for ObjectId support
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

    # 7. Final initialization success log (silenced)
    # if sys.stdout and sys.stdout.isatty():
    #     print("[PATCH] Djongo cursor patches applied.")

if __name__ == "__main__":
    apply_djongo_patches()

