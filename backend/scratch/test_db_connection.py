import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connections
from django.db.utils import OperationalError

def check_db():
    db_conn = connections['default']
    try:
        # Trigger a connection
        db_conn.cursor()
        print("SUCCESS: Successfully connected to the database!")
        print(f"DATABASE NAME: {settings.DATABASES['default']['NAME']}")
        
        # Check if we can actually reach the server
        client = db_conn.connection.client
        db = client[settings.DATABASES['default']['NAME']]
        server_info = client.server_info()
        print(f"SERVER INFO: Connected to MongoDB version {server_info.get('version')}")
        
    except OperationalError as e:
        print(f"ERROR: Could not connect to the database. {e}")
    except Exception as e:
        print(f"UNEXPECTED ERROR: {e}")

if __name__ == "__main__":
    check_db()
