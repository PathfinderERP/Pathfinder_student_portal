import csv

csv_path = r"a:\Pathfinder_student_portal\topics_export.csv"
try:
    with open(csv_path, 'r', encoding='windows-1252') as f:
        reader = csv.reader(f)
        headers = next(reader)
        print("Headers:", headers)
        row1 = next(reader)
        print("Row 1:", row1)
except Exception as e:
    print("Error:", e)
