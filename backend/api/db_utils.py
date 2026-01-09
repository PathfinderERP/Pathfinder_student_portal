import os
from pymongo import MongoClient
from django.conf import settings
from datetime import datetime

def get_db():
    try:
        # Try to get existing connection from settings if available
        # But for reliability, let's just initialize a small client
        host = settings.DATABASES['default']['CLIENT']['host']
        db_name = settings.DATABASES['default']['NAME']
        client = MongoClient(host)
        return client[db_name]
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
