import os
import django

# Set up environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# 1. Apply Patch
try:
    from djongo_patch import apply_djongo_patches
    apply_djongo_patches()
except Exception as e:
    print(f"Failed to apply patch in test: {e}")

django.setup()

from sections.models import Section

def test_create_with_patch():
    print("Testing Section creation with patch...")
    code = "PATCH_TEST_1"
    name = "Section created with patch"
    
    # Delete if exists
    Section.objects.filter(code=code).delete()
    
    # Create
    print(f"Attempting to create section: {code}")
    sec = Section.objects.create(code=code, name=name)
    
    # Check
    fetched = Section.objects.get(code=code)
    print(f"Fetched back -> ID: {fetched._id}, Code: {fetched.code}, Name: {fetched.name}")
    
    if fetched.code == code and fetched.name == name:
        print("✅ SUCCESS: Data saved correctly!")
    else:
        print("❌ FAILURE: Data was not saved correctly (still None?)")

if __name__ == "__main__":
    test_create_with_patch()
