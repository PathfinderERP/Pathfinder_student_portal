from djongo import models as djongo_models
from django.db import models
from master_data.models import TargetExam, Session

class Package(models.Model):
    _id = djongo_models.ObjectIdField(primary_key=True)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    
    # Foreign Keys
    exam_type = models.ForeignKey(TargetExam, on_delete=models.SET_NULL, null=True, blank=True)
    session = models.ForeignKey(Session, on_delete=models.SET_NULL, null=True, blank=True)
    
    image = models.ImageField(upload_to='package_images/', blank=True, null=True)
    
    # Status
    content_status = models.BooleanField(default=False)
    test_status = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False) # Toggle status
    is_active = models.BooleanField(default=True) # Soft delete
    
    start_year = models.IntegerField(null=True, blank=True)
    end_year = models.IntegerField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
