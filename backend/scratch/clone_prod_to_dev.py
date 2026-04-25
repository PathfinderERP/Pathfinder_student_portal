import os
from pymongo import MongoClient
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Load credentials from .env
load_dotenv()

def clone_database():
    # 1. Setup Connection
    user = os.getenv('MONGO_USERNAME')
    pwd = os.getenv('MONGO_PASSWORD')
    
    if not all([user, pwd]):
        print("❌ ERROR: MONGO_USERNAME or MONGO_PASSWORD not found in .env")
        return

    _user = quote_plus(user)
    _pwd = quote_plus(pwd)
    
    # Use the direct hosts from your settings.py for maximum reliability
    hosts = "ac-sozji20-shard-00-00.ariihtc.mongodb.net:27017,ac-sozji20-shard-00-01.ariihtc.mongodb.net:27017,ac-sozji20-shard-00-02.ariihtc.mongodb.net:27017"
    uri = f"mongodb://{_user}:{_pwd}@{hosts}/?ssl=true&replicaSet=atlas-38xoz1-shard-0&authSource=admin&retryWrites=true&w=majority"
    
    client = MongoClient(uri)
    
    # Source and Target
    SOURCE_DB_NAME = 'studentportal'
    TARGET_DB_NAME = 'studentportal_dev'
    
    source_db = client[SOURCE_DB_NAME]
    target_db = client[TARGET_DB_NAME]
    
    print(f"🔄 Starting database clone...")
    print(f"📤 Source: {SOURCE_DB_NAME}")
    print(f"📥 Target: {TARGET_DB_NAME}")
    print("-" * 40)
    
    # 2. Get all collections from source
    collections = source_db.list_collection_names()
    
    for coll_name in collections:
        # Skip MongoDB system collections
        if coll_name.startswith('system.'):
            continue
            
        print(f"📦 Copying [{coll_name}]...", end=" ", flush=True)
        
        # Drop target collection first to avoid index conflicts during clone
        target_db[coll_name].drop()
        
        # Get all documents from source
        cursor = source_db[coll_name].find()
        docs = list(cursor)
        
        if docs:
            # Djongo/MongoDB allows bulk insert of the same objects
            target_db[coll_name].insert_many(docs)
            print(f"✅ Success ({len(docs)} documents)")
        else:
            print("ℹ️ Empty (Skipped)")

    print("-" * 40)
    print("✨ DATABASE CLONE COMPLETED SUCCESSFULLY!")
    print("You now have a full copy of production data in your development environment.")
    client.close()

if __name__ == "__main__":
    clone_database()
