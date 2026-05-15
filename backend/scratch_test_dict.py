data = {'student': None}
try:
    details = data.get('student', {}).get('studentsDetails', [])
    print("Success")
except Exception as e:
    print(f"Error: {e}")
