import sys
import re
import logging

logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)

def apply_djongo_patches():
    """
    Djongo Monkeypatches for Django 4.x + MongoDB Compatibility.
    
    Django 4.x changed SQL generation for boolean fields to emit "bare" column
    references in WHERE clauses (e.g., WHERE "table"."is_active") which Djongo
    cannot parse. This patch transforms them into proper comparisons with parameters.
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

        if isinstance(sql, str):
            keywords = r'(?:NOT|EXISTS|TRUE|FALSE|NULL|SELECT|FROM|WHERE|AND|OR|ORDER|LIMIT|GROUP|BY|IN|IS)'
            col_pat  = r'("?[\w\d._]+"?(?:\."?[\w\d._]+"?)?)'
            neg_op   = r'(?!\s*(?:=|<|>|!|IS|IN))'
            pos_term = r'(?=\s*(?:AND|OR|ORDER|LIMIT|GROUP|BY|\)|,|\s*$))'

            # Convert params to a mutable list
            new_params = list(params) if params else []

            # 2a. WHERE/AND/OR NOT col  →  WHERE/AND/OR col = %s (False)
            def replace_not(match):
                prefix, col = match.group(1), match.group(2)
                if re.match('^' + keywords + '$', col, re.IGNORECASE):
                    return match.group(0)
                new_params.append(False)
                return f"{prefix}{col} = %s"

            not_pattern = r'(\b(?:WHERE|AND|OR)\b\s+)NOT\s+' + col_pat + neg_op
            sql = re.sub(not_pattern, replace_not, sql, flags=re.IGNORECASE)

            # 2b. WHERE/AND/OR col (bare, after keyword)  →  ... col = %s (True)
            def replace_bare_kw(match):
                prefix, col = match.group(1), match.group(2)
                if re.match('^' + keywords + '$', col, re.IGNORECASE):
                    return match.group(0)
                new_params.append(True)
                return f"{prefix}{col} = %s"

            bare_kw_pattern = r'(\b(?:WHERE|AND|OR)\b\s+)' + col_pat + neg_op + pos_term
            sql = re.sub(bare_kw_pattern, replace_bare_kw, sql, flags=re.IGNORECASE)

            # 2c. (col  (bare, after opening parenthesis)  →  (col = %s (True)
            def replace_bare_paren(match):
                prefix, col = match.group(1), match.group(2)
                if re.match('^' + keywords + '$', col, re.IGNORECASE):
                    return match.group(0)
                new_params.append(True)
                return f"{prefix}{col} = %s"

            bare_paren_pattern = r'(\(\s*)' + col_pat + neg_op + pos_term
            sql = re.sub(bare_paren_pattern, replace_bare_paren, sql, flags=re.IGNORECASE)

            # 3. Fix placeholder syntax %(0)s → %s
            sql = re.sub(r'%\(\d+\)s', '%s', sql)

            # 4. Remove RETURNING clause (unsupported by MongoDB)
            sql = re.sub(r'\s+RETURNING\s+.*$', '', sql, flags=re.IGNORECASE)

            # 5. Fix UPDATE aliases
            if sql.strip().upper().startswith('UPDATE'):
                sql = re.sub(r'WHERE\s+[\w\d_"]+\.id\s*=', 'WHERE id =', sql, flags=re.IGNORECASE)

            # Update params
            if new_params:
                params = tuple(new_params)
            else:
                params = None

        # Unwrap single-element tuple-of-tuple params
        if params and isinstance(params, (list, tuple)) and len(params) == 1:
            if isinstance(params[0], (list, tuple)):
                params = params[0]

        try:
            return Cursor._original_execute(self, sql, params)
        except Exception as e:
            print(f"\n--- DJONGO EXECUTE ERROR ---\nSQL: {sql}\nPARAMS: {params}\nERROR: {e}\n---------------------------\n")
            raise e

    Cursor.execute = patched_execute
    print("Djongo Cursor patch successfully applied (Resilient v10)")

    # Patch InsertQuery to handle Token subscript errors
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
                self._values = [v.strip() for v in match.group(1).split(',')]
            else:
                self._values = ['%s'] * len(getattr(self, '_cols', []))

        InsertQuery._columns = robust_columns
        InsertQuery._values = robust_values
        InsertQuery._is_patched = True
        print("Djongo InsertQuery patch successfully applied")

if __name__ == "__main__":
    apply_djongo_patches()
