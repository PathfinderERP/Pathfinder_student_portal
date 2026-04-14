import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from django.db import connection

def run():
    print("=" * 30)
    print("FIXING FKs IN MONGODB DOCUMENTS")
    print("=" * 30)
    
    # Target ID for 'STUDY MATERIAL'
    STUDY_SEC_ID = 2
    
    db = connection.pg_connection # In Djongo, this might vary, but let's try to get the database object
    # Actually, let's use pymongo directly from the connection settings
    from django.conf import settings
    from pymongo import MongoClient
    
    # Get connection details from Django settings
    db_config = settings.DATABASES['default']
    client = MongoClient(db_config['CLIENT']['host'])
    db = client[db_config['NAME']]
    
    # 1. Update FK models
    fk_collections = [
        'master_data_libraryitem',
        'master_data_notice',
        'master_data_liveclass',
        'master_data_video'
    ]
    
    for coll_name in fk_collections:
        print(f"Updating collection: {coll_name}")
        result = db[coll_name].update_many({}, {"$set": {"section_id": STUDY_SEC_ID}})
        print(f"  Matched: {result.matched_count}, Modified: {result.modified_count}")

    # 2. Update M2M junction collections
    # These usually have 'solutionitem_id' and 'mastersection_id' (or similar)
    # We want to clear existing ones and add the study sec for all items
    m2m_configs = [
        ('master_data_solutionitem', 'master_data_solutionitem_sections', 'solutionitem_id'),
        ('master_data_penpapertest', 'master_data_penpapertest_sections', 'penpapertest_id'),
        ('master_data_homework', 'master_data_homework_sections', 'homework_id')
    ]
    
    for parent_coll, junction_coll, parent_id_field in m2m_configs:
        print(f"Updating M2M: {junction_coll}")
        # Clear existing
        db[junction_coll].delete_many({})
        
        # Get all parent IDs
        parent_ids = [doc['_id'] for doc in db[parent_coll].find({}, {"_id": 1})]
        
        # Insert new links
        if parent_ids:
            new_links = [{parent_id_field: pid, "mastersection_id": STUDY_SEC_ID} for pid in parent_ids]
            db[junction_coll].insert_many(new_links)
            print(f"  Inserted {len(new_links)} links for {len(parent_ids)} parents.")

    print("=" * 30)
    print("DONE")

if __name__ == "__main__":
    run()
