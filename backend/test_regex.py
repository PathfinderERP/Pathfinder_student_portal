import re

keywords = r'(?:NOT|EXISTS|TRUE|FALSE|NULL|SELECT|FROM|WHERE|AND|OR|ORDER|LIMIT|GROUP|BY|IN|IS)'

# Test cases - exactly what Django 4.x generates
test_sqls = [
    # Single bare boolean column
    ('SELECT COUNT(*) FROM t WHERE "t"."is_active"', []), 
    # Two bare boolean columns in parentheses
    ('SELECT COUNT(*) FROM t WHERE ("t"."is_active" AND "t"."is_published")', []),
    # NOT boolean
    ('SELECT COUNT(*) FROM t WHERE NOT "t"."is_pinned"', []),
    # Mixed
    ('SELECT * FROM t WHERE "t"."name" = %s AND "t"."is_active"', ['John']),
    # NOT + AND in parens
    ('SELECT COUNT(*) FROM t WHERE NOT ("t"."is_active")', []),
]

# NOT: handles WHERE/AND/OR NOT col
not_bare_pattern = r'(\b(?:WHERE|AND|OR)\b\s+)NOT\s+("?[\w\d._]+"?(?:\."?[\w\d._]+"?)?)(?!\s*(?:=|<|>|!|IS|IN))'

# BARE: handles WHERE col, AND col, OR col, (col  - at start of group
# We need two sub-patterns:
# 1. After a keyword (WHERE, AND, OR) with optional spaces
bare_kw_pattern = r'(\b(?:WHERE|AND|OR)\b\s+)("?[\w\d._]+"?(?:\."?[\w\d._]+"?)?)(?!\s*(?:=|<|>|!|IS|IN))(?=\s*(?:AND|OR|ORDER|LIMIT|GROUP|BY|\)|,|\s*$))'
# 2. After opening parenthesis
bare_paren_pattern = r'(\(\s*)("?[\w\d._]+"?(?:\."?[\w\d._]+"?)?)(?!\s*(?:=|<|>|!|IS|IN))(?=\s*(?:AND|OR|ORDER|LIMIT|GROUP|BY|\)|\s*$))'

def apply_fix(sql, params):
    new_params = list(params) if params else []

    def replace_not(match):
        prefix, col = match.group(1), match.group(2)
        if re.match('^' + keywords + '$', col, re.IGNORECASE): return match.group(0)
        new_params.append(False)
        return f"{prefix}{col} = %s"
    
    def replace_bare(match):
        if len(match.groups()) != 2: return match.group(0)
        prefix, col = match.group(1), match.group(2)
        if re.match('^' + keywords + '$', col, re.IGNORECASE): return match.group(0)
        new_params.append(True)
        return f"{prefix}{col} = %s"
    
    sql = re.sub(not_bare_pattern, replace_not, sql, flags=re.IGNORECASE)
    sql = re.sub(bare_kw_pattern, replace_bare, sql, flags=re.IGNORECASE)
    sql = re.sub(bare_paren_pattern, replace_bare, sql, flags=re.IGNORECASE)
    
    return sql, new_params

for sql, params in test_sqls:
    sql, params = apply_fix(sql, params)
    print(f"SQL:    {sql}")
    print(f"PARAMS: {params}")
    print()

print("Done")
