
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
                # Remove quotes that Djongo's parser chokes on
                sql = sql.replace('"', '').replace('`', '')
                # Fix common SQL syntax that Djongo doesn't support well
                sql = re.sub(r'\s+RETURNING\s+.*$', '', sql, flags=re.IGNORECASE)
                sql = re.sub(r'%\([\w\d]+\)s', '%s', sql)
                # Normalize all whitespace to single spaces to help the skip(N) parser
                sql = ' '.join(sql.split())
                
            try:
                return original_execute(self, sql, params)
            except Exception as e:
                # If it's a parse error/database error, try manual grouping assist
                if 'SQLDecodeError' in str(type(e)) or 'DatabaseError' in str(type(e)):
                    # Add spaces around parentheses to help sqlparse group them
                    sql = sql.replace('(', ' ( ').replace(')', ' ) ')
                    return original_execute(self, sql, params)
                raise
        Cursor.execute = patched_execute

        # 2. Patch InsertQuery.parse to be extremely robust
        from djongo.sql2mongo.query import InsertQuery, SQLToken
        
        original_insert_parse = InsertQuery.parse
        def robust_insert_parse(self):
            try:
                return original_insert_parse(self)
            except Exception:
                # If standard parse fails, use regex fallback
                sql = str(self.statement)
                
                # Extract columns
                col_match = re.search(r'INSERT INTO .*?\((.*?)\)', sql, re.IGNORECASE | re.DOTALL)
                if col_match:
                    self._cols = [c.strip().replace('"', '').replace('`', '') for c in col_match.group(1).split(',')]
                
                # Extract values/placeholders
                val_match = re.search(r'VALUES\s*\((.*)\)', sql, re.IGNORECASE | re.DOTALL)
                if val_match:
                    self._values = [v.strip() for v in val_match.group(1).split(',')]
                
                return self
        
        InsertQuery.parse = robust_insert_parse

    except Exception as e:
        print(f"Djongo patch failed: {e}")
# ---------------------------------------------------------
