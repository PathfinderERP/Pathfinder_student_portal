from django.db import models
from django.contrib.auth.models import AbstractUser
from djongo import models as djongo_models
import json

class SafeJSONField(models.JSONField):
    """
    Djongo sometimes returns data already parsed as a dict/list/OrderedDict.
    Django's native JSONField tries to json.loads() it, which fails.
    This field safely handles both string and already-parsed cases.
    """
    def get_internal_type(self):
        return 'JSONField'

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        if not isinstance(value, str):
            return value
        try:
            return json.loads(value, cls=self.decoder)
        except (ValueError, TypeError):
            return value

class CustomUser(AbstractUser):
    _id = djongo_models.ObjectIdField(primary_key=True)
    USER_TYPE_CHOICES = (
        ('superadmin', 'Superadmin'),
        ('admin', 'Admin'),
        ('staff', 'Staff'),
        ('student', 'Student'),
        ('parent', 'Parent'),
    )
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='student')
    
    # Permissions for staff: simple JSON field storing booleans
    permissions = SafeJSONField(default=dict, blank=True)
    
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.user_type})"

class UploadedFile(models.Model):
    title = models.CharField(max_length=255)
    # This will upload to Cloudflare R2 if configured, and save the path in MongoDB
    file = models.FileField(upload_to='uploads/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
