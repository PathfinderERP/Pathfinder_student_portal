from django.apps import AppConfig
from django.db import connections
from django.db.utils import OperationalError
import sys

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Avoid running this during migrations or other management commands if desired,
        # but generally okay for runserver confirmation.
        if 'runserver' not in sys.argv:
            return

        try:
            db_conn = connections['default']
            db_conn.cursor()
            print("\n✅ \033[92mSuccessfully connected to MongoDB Atlas!\033[0m\n")
        except OperationalError:
            print("\n❌ \033[91mFailed to connect to MongoDB Atlas\033[0m\n")
        except Exception as e:
            print(f"\n❌ \033[91mDatabase connection error: {e}\033[0m\n")
