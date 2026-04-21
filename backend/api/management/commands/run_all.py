import os
import subprocess
import sys
import threading
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Runs both Django server and Node.js Chat server simultaneously'

    def handle(self, *args, **options):
        # 1. Paths
        # __file__ is at: backend/api/management/commands/run_all.py
        # We need to go up 5 levels to get to the root 'student portal'
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
        backend_dir = os.path.join(root_dir, 'backend')
        chat_server_dir = os.path.join(root_dir, 'chat-server')
        
        # Detect Virtual Env
        venv_path = os.path.join(backend_dir, '.venv', 'Scripts', 'python.exe')
        if not os.path.exists(venv_path):
            # Try project root
            venv_path = os.path.join(root_dir, '.venv', 'Scripts', 'python.exe')
        
        current_python = venv_path if os.path.exists(venv_path) else sys.executable

        self.stdout.write(self.style.SUCCESS('[*] Initiating Pathfinder Multi-Server Launch Sequence...'))
        self.stdout.write(self.style.MIGRATE_LABEL(f'Python: {current_python}'))

        # 2. Launch Node.js Server
        def run_node():
            self.stdout.write(self.style.MIGRATE_LABEL(f'Starting Chat Server in {chat_server_dir}...'))
            
            # Auto-clear port 4000 to prevent EADDRINUSE
            if sys.platform == 'win32':
                try:
                    # Find PID on port 4000 and kill it
                    result = subprocess.check_output('netstat -ano | findstr :4000', shell=True).decode()
                    pids = {line.split()[-1] for line in result.strip().split('\n') if 'LISTENING' in line}
                    for pid in pids:
                        self.stdout.write(self.style.WARNING(f'[FIX] Clearing port 4000 (PID {pid})...'))
                        subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
                except Exception:
                    pass

            try:
                # Use shell=True for Windows compatibility with npm
                subprocess.run(['npm', 'start'], cwd=chat_server_dir, shell=True)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Failed to start Chat Server: {e}'))

        node_thread = threading.Thread(target=run_node)
        node_thread.daemon = True
        node_thread.start()

        # 3. Launch Django Server
        self.stdout.write(self.style.MIGRATE_LABEL('Starting Django Server (port 3001)...'))
        try:
            # We use the detected python executable
            subprocess.run([current_python, 'manage.py', 'runserver', '3001'], cwd=backend_dir, shell=False)
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS('\nShutting down all servers. Goodbye!'))
            sys.exit(0)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Django execution error: {e}'))
