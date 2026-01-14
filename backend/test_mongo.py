import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from sections.models import Section

def test_mongo():
    print("Testing MongoDB storage...")
    try:
        # Create a test section
        code = "TEST001"
        name = "Test Section"
        
        # Check if already exists, delete if it does
        print(f"Cleaning up existing test data for code: {code}")
        Section.objects.filter(code=code).delete()
        
        # Create new
        print("Creating new section...")
        section = Section.objects.create(code=code, name=name)
        print(f"Success: Created section: {section}")
        
        # Fetch it back
        print("Fetching section back from DB...")
        fetched = Section.objects.get(code=code)
        print(f"Success: Fetched section from DB: {fetched.name} (ID: {fetched._id})")
        
        # List all
        count = Section.objects.count()
        print(f"Total sections in DB: {count}")
        
        return True
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_mongo()
