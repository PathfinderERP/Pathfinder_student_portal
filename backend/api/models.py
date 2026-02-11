from django.db import models
from django.contrib.auth.models import AbstractUser
from djongo import models as djongo_models
import json

class SafeJSONField(djongo_models.JSONField):
    """
    Djongo native JSONField handles MongoDB objects correctly.
    """
    def get_internal_type(self):
        return 'JSONField'

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
    
    # Track who created this user (storing username directly to avoid ForeignKey issues with Djongo)
    created_by_username = models.CharField(max_length=150, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.user_type})"

class UploadedFile(models.Model):
    title = models.CharField(max_length=255)
    # This will upload to Cloudflare R2 if configured, and save the path in MongoDB
    file = models.FileField(upload_to='uploads/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class LoginLog(models.Model):
    user_id = models.CharField(max_length=100, null=True, blank=True)
    username = models.CharField(max_length=150, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, default='Success')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.username or 'Unknown'} - {self.ip_address} - {self.created_at}"

class Grievance(models.Model):
    PRIORITY_CHOICES = (
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    )
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Unassigned', 'Unassigned'),
        ('Assign', 'Assign'),
        ('Resolved', 'Resolved'),
        ('Rejected', 'Rejected'),
    )
    student_name = models.CharField(max_length=255)
    student_id = models.CharField(max_length=100, null=True, blank=True)
    subject = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    description = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    date = models.DateTimeField(auto_now_add=True)
    
    # Assignment details
    teacher_name = models.CharField(max_length=255, null=True, blank=True)
    teacher_id = models.CharField(max_length=100, null=True, blank=True)
    assign_date = models.DateTimeField(null=True, blank=True)
    solved_date = models.DateTimeField(null=True, blank=True)
    solution_description = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.subject} - {self.student_name}"
