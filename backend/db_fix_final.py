from django.conf import settings
from pymongo import MongoClient
import os
import django

# No need for os.environ/django.setup if running inside manage.py shell

db_config = settings.DATABASES['default']
client = MongoClient(db_config['CLIENT']['host'])
db = client[db_config['NAME']]

STUDY_SEC_ID = 2

# FK collections
fk_colls = ['master_data_libraryitem', 'master_data_notice', 'master_data_liveclass', 'master_data_video']
for coll in fk_colls:
    res = db[coll].update_many({}, {"$set": {"section_id": STUDY_SEC_ID}})
    print(f"{coll}: Updated {res.modified_count}")

# M2M collections
m2m_colls = [
    ('master_data_solutionitem', 'master_data_solutionitem_sections', 'solutionitem_id'),
    ('master_data_penpapertest', 'master_data_penpapertest_sections', 'penpapertest_id'),
    ('master_data_homework', 'master_data_homework_sections', 'homework_id')
]

for parent, junction, pid_field in m2m_colls:
    db[junction].delete_many({}) # Clear old
    pids = [d['_id'] for d in db[parent].find({}, {"_id": 1})]
    if pids:
        links = [{pid_field: pid, "mastersection_id": STUDY_SEC_ID} for pid in pids]
        db[junction].insert_many(links)
        print(f"{junction}: Inserted {len(links)} links")

print("FINISHED DATABASE UPDATE")
