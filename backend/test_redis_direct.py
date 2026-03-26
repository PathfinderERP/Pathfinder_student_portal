import os
import redis
from dotenv import load_dotenv

# Load .env
load_dotenv()

def test_redis_direct():
    redis_url = os.getenv('REDIS_URL')
    print(f"Testing direct connection to Redis: {redis_url}")
    
    try:
        if not redis_url:
            print("ERROR: REDIS_URL not found in .env")
            return
            
        # Create Redis client
        # Note: rediss:// uses SSL
        client = redis.Redis.from_url(redis_url)
        
        # Ping the server
        if client.ping():
            print("SUCCESS: Redis server responded to PING.")
            
            # Additional check: Set and get a test key
            client.set("health_check", "ok", ex=60)
            val = client.get("health_check")
            if val == b'ok':
                print("SUCCESS: Redis Set/Get working.")
                client.delete("health_check")
            else:
                print(f"FAILED: Redis Set/Get mismatch. Got: {val}")
        else:
            print("FAILED: Redis server did not respond to PING.")
            
    except redis.ConnectionError as e:
        print(f"CONNECTION ERROR: {e}")
    except redis.TimeoutError:
        print("TIMEOUT ERROR: Redis connection timed out.")
    except Exception as e:
        print(f"UNEXPECTED ERROR: {e}")

if __name__ == "__main__":
    test_redis_direct()
