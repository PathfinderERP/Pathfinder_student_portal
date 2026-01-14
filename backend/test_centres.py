import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from centres.models import Centre

def test_centres():
    print("Testing Centres MongoDB storage...")
    try:
        code = "CTR001"
        name = "Kolkata Centre"
        
        print(f"Cleaning up existing test data for code: {code}")
        Centre.objects.filter(code=code).delete()
        
        print("Creating new centre...")
        centre = Centre.objects.create(code=code, name=name, location="Kolkata")
        print(f"Success: Created centre: {centre}")
        
        print("Fetching centre back from DB...")
        fetched = Centre.objects.get(code=code)
        print(f"Success: Fetched centre from DB: {fetched.name} (Location: {fetched.location})")
        
        count = Centre.objects.count()
        print(f"Total centres in DB: {count}")
        
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_centres()
