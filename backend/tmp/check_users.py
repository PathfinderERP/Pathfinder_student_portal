import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import CustomUser

print(f"{'Username':<20} | {'User Type':<15} | {'Is Active':<10}")
print("-" * 50)
for user in CustomUser.objects.all():
    name = str(user.username)
    utype = str(user.user_type) if user.user_type is not None else "None"
    active = str(user.is_active)
    print(f"{name:<20} | {utype:<15} | {active:<10}")
