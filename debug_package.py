import os
import django
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from packages.models import Package
from master_data.models import TargetExam, Session
from bson import ObjectId

def test_package_crud():
    print("Testing Package CRUD...")
    
    # 1. Fetch or Create Master Data
    try:
        exam = TargetExam.objects.first()
        if not exam:
            exam = TargetExam.objects.create(name="Test Exam", code="TEST-EXAM")
            print(f"Created TargetExam: {exam}")
        else:
            print(f"Found TargetExam: {exam} (ID: {exam.id}, Type: {type(exam.id)})")
            
        session = Session.objects.first()
        if not session:
            session = Session.objects.create(name="2025-2026", code="2025-26")
            print(f"Created Session: {session}")
        else:
            print(f"Found Session: {session} (ID: {session.id}, Type: {type(session.id)})")
            
        # 2. Create Package
        pkg_data = {
            'name': 'Test Package',
            'code': 'TP-001',
            'description': 'Test Description',
            'exam_type': exam,
            'session': session
        }
        
        # Check if already exists
        if Package.objects.filter(code='TP-001').exists():
            print("Package TP-001 already exists, deleting for test...")
            Package.objects.filter(code='TP-001').delete()

        pkg = Package.objects.create(**pkg_data)
        print(f"Created Package: {pkg} (ID: {pkg._id})")
        
        # 3. Read Package
        read_pkg = Package.objects.get(_id=pkg._id)
        print(f"Read Package: {read_pkg.name}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_package_crud()
