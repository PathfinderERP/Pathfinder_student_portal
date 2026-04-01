from api.db_utils import get_db
db = get_db()
if not db:
    print("No DB connection")
    exit()

test_id = 4 # From trace
sub_docs = list(db['tests_testsubmission'].find({'test_id': test_id}))
print(f"Total Submissions for Test {test_id}: {len(sub_docs)}")
for doc in sub_docs:
    s_id = doc.get('student_id')
    user = db['api_customuser'].find_one({'_id': s_id})
    if user:
        print(f"Student: {user.get('username')}, Centre: {user.get('centre_code')} / {user.get('centre_name')}")
    else:
        print(f"Student PK {s_id} not found in api_customuser")
