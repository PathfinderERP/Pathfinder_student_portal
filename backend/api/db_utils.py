import os
import ast
from pymongo import MongoClient
from django.conf import settings
from datetime import datetime

def parse_section(sec_string):
    if not sec_string:
        return []
    sec_string = str(sec_string).strip()
    try:
        if sec_string.startswith('['):
            parsed = ast.literal_eval(sec_string)
            if isinstance(parsed, list):
                return [str(p).strip() for p in parsed if p]
    except Exception:
        pass
    return [sec_string]

_mongo_client = None
_mongo_db = None

def get_db():
    global _mongo_client, _mongo_db
    try:
        if _mongo_client is not None:
            return _mongo_db
            
        host = settings.DATABASES['default']['CLIENT']['host']
        db_name = settings.DATABASES['default']['NAME']
        
        # Initialize client with connection pooling and timeouts
        _mongo_client = MongoClient(
            host, 
            serverSelectionTimeoutMS=5000, 
            connectTimeoutMS=5000,
            socketTimeoutMS=5000,
            retryWrites=True
        )
        _mongo_db = _mongo_client[db_name]
        return _mongo_db
    except Exception as e:
        print(f"Direct DB Access Error: {e}")
        return None

def log_login_direct(user_id, username, ip, user_agent):
    db = get_db()
    if db is not None:
        try:
            db.api_loginlog.insert_one({
                "user_id": str(user_id),
                "username": str(username),
                "ip_address": str(ip),
                "user_agent": str(user_agent),
                "status": "Success",
                "created_at": datetime.utcnow()
            })
            print(f"DIRECT LOG SUCCESS for {username}")
        except Exception as e:
            print(f"DIRECT LOG ERROR: {e}")

def get_recent_logs_direct(limit=10):
    db = get_db()
    if db is not None:
        try:
            logs = list(db.api_loginlog.find().sort("created_at", -1).limit(limit))
            formatted = []
            from datetime import timedelta
            
            for log in logs:
                dt = log.get("created_at")
                time_str = "Just now"
                if dt:
                    # Adjust to IST (+5:30)
                    ist_time = dt + timedelta(hours=5, minutes=30)
                    time_str = ist_time.strftime("%b %d, %I:%M %p")
                
                formatted.append({
                    "id": str(log.get("_id")),
                    "username": log.get("username") or "User",
                    "ip_address": log.get("ip_address") or "Local",
                    "user_agent": log.get("user_agent") or "Device",
                    "status": log.get("status") or "Success",
                    "time": time_str
                })
            return formatted
        except Exception as e:
            print(f"DIRECT GET ERROR: {e}")
    return []
