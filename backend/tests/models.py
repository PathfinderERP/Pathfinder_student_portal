from django.db import models
from master_data.models import Session, ExamType, ClassLevel

class Test(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    
    # Relationships to Master Data
    session = models.ForeignKey(Session, on_delete=models.SET_NULL, null=True, related_name='tests')
    exam_type = models.ForeignKey(ExamType, on_delete=models.SET_NULL, null=True, related_name='tests')
    class_level = models.ForeignKey(ClassLevel, on_delete=models.SET_NULL, null=True, related_name='tests')
    
    duration = models.IntegerField(default=180, help_text="Duration in minutes")
    description = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"
