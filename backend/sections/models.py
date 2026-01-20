from djongo import models as djongo_models
from django.db import models

class Section(models.Model):
    _id = djongo_models.ObjectIdField(primary_key=True)
    test = models.ForeignKey('tests.Test', on_delete=models.CASCADE, related_name='sections', null=True, blank=True)
    name = models.CharField(max_length=255)
    subject_code = models.CharField(max_length=50, default='GEN') # PHY, CHE, etc.
    
    total_questions = models.IntegerField(default=20)
    allowed_questions = models.IntegerField(default=20)
    shuffle = models.BooleanField(default=False)
    
    correct_marks = models.FloatField(default=4.0)
    negative_marks = models.FloatField(default=1.0)
    
    partial_type = models.CharField(max_length=50, default='regular')
    partial_marks = models.FloatField(default=0.0)
    
    priority = models.IntegerField(default=1)
    
    # Relationships
    questions = models.ManyToManyField('questions.Question', related_name='assigned_sections', blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['priority', 'created_at']

    def __str__(self):
        test_name = self.test.name if self.test else "No Test"
        return f"{self.name} - {test_name}"
