
# ---------------------------------------------------------
# Djongo Monkeypatches for Django 4.x + MongoDB Compatibility
# ---------------------------------------------------------
import sys
import re

def apply_djongo_patches():
    try:
        import djongo.cursor
        import djongo.sql2mongo.query
        
        Cursor = djongo.cursor.Cursor
        query = djongo.sql2mongo.query

        # 1. Patch Cursor.execute to fix SQL quoting and placeholders
        original_execute = Cursor.execute
        def patched_execute(self, sql, params=None):
            if isinstance(sql, str):
                # Remove quotes that Djongo's parser chokes on
                sql = sql.replace('"', '').replace('`', '')
                # Fix common SQL syntax that Djongo doesn't support well
                sql = re.sub(r'\s+RETURNING\s+.*$', '', sql, flags=re.IGNORECASE)
                sql = re.sub(r'%\([\w\d]+\)s', '%s', sql)
                # Normalize all whitespace to single spaces
                sql = ' '.join(sql.split())
                
            try:
                return original_execute(self, sql, params)
            except Exception as e:
                # If it's a parse error/database error, try manual grouping assist
                if 'SQLDecodeError' in str(type(e)) or 'DatabaseError' in str(type(e)):
                    # Add spaces around parentheses to help sqlparse group them
                    sql = sql.replace('(', ' ( ').replace(')', ' ) ')
                    try:
                        return original_execute(self, sql, params)
                    except Exception:
                        pass
                raise
        Cursor.execute = patched_execute

        # 2. Patch InsertQuery components to be robust without breaking data mapping
        InsertQuery = djongo.sql2mongo.query.InsertQuery
        SQLToken = djongo.sql2mongo.query.SQLToken
        
        from sqlparse.sql import Parenthesis, TokenList

        def safe_tokens2sql(tok, query):
            # Djongo's SQLToken.tokens2sql expects a TokenList (subscriptable)
            # If we have a single Token, wrap it or handle it
            if isinstance(tok, (Parenthesis, TokenList, list, tuple)):
                try:
                    return SQLToken.tokens2sql(tok[1] if isinstance(tok, Parenthesis) else tok, query)
                except (TypeError, IndexError):
                    pass
            
            # Desperation: if it's not a list, it's just a Token (like a single col or placeholder)
            # But tokens2sql usually expects the INNER content of the parenthesis
            return []

        def robust_columns(self, statement):
            tok = statement.next()
            while tok and tok.is_whitespace:
                tok = statement.next()
            if not tok: return
            
            try:
                self._cols = [token.column for token in safe_tokens2sql(tok, self)]
            except Exception:
                # Regex fallback for columns 
                match = re.search(r'INSERT INTO .*?\((.*?)\)', str(statement), re.IGNORECASE)
                if match:
                    self._cols = [c.strip().replace('"', '').replace('`', '') for c in match.group(1).split(',')]
                else:
                    self._cols = []

        def robust_values(self, statement):
            tok = statement.next()
            while tok and tok.value.upper() != 'VALUES':
                tok = statement.next()
            tok = statement.next()
            while tok and tok.is_whitespace:
                tok = statement.next()
            if not tok: return

            try:
                self._values = [token.value for token in safe_tokens2sql(tok, self)]
            except Exception:
                # Regex fallback for values
                match = re.search(r'VALUES\s*\((.*?)\)', str(statement), re.IGNORECASE)
                if match:
                    self._values = [v.strip() for v in match.group(1).split(',')]
                else:
                    self._values = []

        InsertQuery._columns = robust_columns
        InsertQuery._values = robust_values

    except Exception as e:
        print(f"Djongo patch failed: {e}")
# ---------------------------------------------------------
