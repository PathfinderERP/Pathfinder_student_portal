from django.core.management.base import BaseCommand
from api.models import CustomUser

class Command(BaseCommand):
    help = 'Promote a user to superadmin'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username to promote')

    def handle(self, *args, **options):
        username = options['username']
        try:
            user = CustomUser.objects.get(username=username)
            user.user_type = 'superadmin'
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Successfully promoted {username} to superadmin'))
        except CustomUser.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User {username} not found'))
