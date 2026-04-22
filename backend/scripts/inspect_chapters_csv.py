import csv
import io
from collections import Counter

path = r"f:\student portal\chapters export with codes.csv"
encodings = ['utf-8-sig', 'utf-8', 'cp1252', 'latin-1']
raw = open(path, 'rb').read()
for enc in encodings:
    try:
        s = raw.decode(enc)
        used = enc
        break
    except Exception:
        used = None

if used is None:
    s = raw.decode('latin-1', errors='replace')
    used = 'latin-1-replace'

print('decoded using', used)
reader = csv.DictReader(io.StringIO(s))

total = 0
rows_with_values = 0
missing_required = 0
problems = []
class_counter = Counter()
subject_counter = Counter()

for idx, row in enumerate(reader, start=2):
    total += 1
    if any(row.values()):
        rows_with_values += 1
    name = (row.get('Name') or '').strip()
    cls = (row.get('Class Level') or '').strip()
    subject = (row.get('Subject') or '').strip()
    if not name or not cls or not subject:
        missing_required += 1
        problems.append((idx, row))
    class_counter[cls] += 1
    subject_counter[subject] += 1

print('total rows parsed:', total)
print('rows with any values:', rows_with_values)
print('rows missing required fields:', missing_required)
print('unique class levels:', len([k for k in class_counter if k]))
print('sample class levels:', list(class_counter.items())[:10])
print('unique subjects:', len([k for k in subject_counter if k]))
print('sample subjects:', list(subject_counter.items())[:10])
print('\nfirst 10 problem rows:')
for p in problems[:10]:
    print(p)
