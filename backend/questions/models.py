from djongo import models as djongo_models
from django.db import models
from master_data.models import ClassLevel, Subject, Topic, ExamType, TargetExam

class Question(models.Model):
    _id = djongo_models.ObjectIdField(primary_key=True)
    
    # Classification
    class_level = models.ForeignKey(ClassLevel, on_delete=models.SET_NULL, null=True, related_name='questions')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, related_name='questions')
    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, related_name='questions')
    
    exam_type = models.ForeignKey(ExamType, on_delete=models.SET_NULL, null=True, blank=True, related_name='questions')
    target_exam = models.ForeignKey(TargetExam, on_delete=models.SET_NULL, null=True, blank=True, related_name='questions')
    
    # Metadata
    QUESTION_TYPES = (
        ('SINGLE_CHOICE', 'SINGLE_CHOICE'),
        ('MULTI_CHOICE', 'MULTI_CHOICE'),
        ('MATRIX', 'MATRIX'),
        ('ASSERTION', 'ASSERTION'),
        ('INTEGER_TYPE', 'INTEGER_TYPE'),
        ('NUMERICAL', 'NUMERICAL'),
        ('PARAGRAPH', 'PARAGRAPH'),
    )
    type = models.CharField(max_length=50, choices=QUESTION_TYPES, default='SINGLE_CHOICE')
    level = models.CharField(max_length=10, default='1') # 1-5
    
    # Content
    content = models.TextField(help_text="Rich text content")
    image_1 = models.TextField(blank=True, null=True, help_text="Primary image URL")
    image_2 = models.TextField(blank=True, null=True, help_text="Secondary image URL")
    solution = models.TextField(blank=True, null=True, help_text="Rich text solution")
    
    # Options (Stored as JSON for flexibility in MongoDB)
    # Structure: [{"id": 1, "content": "...", "isCorrect": boolean}]
    options = models.JSONField(default=list, blank=True)
    
    # Numerical Answers
    answer_from = models.FloatField(null=True, blank=True)
    answer_to = models.FloatField(null=True, blank=True)
    
    # Settings
    has_calculator = models.BooleanField(default=False)
    use_numeric_options = models.BooleanField(default=False)
    is_wrong = models.BooleanField(default=False)
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} - {self.subject.name if self.subject else 'No Subject'}"

class QuestionImage(models.Model):
    _id = djongo_models.ObjectIdField(primary_key=True)
    image = models.ImageField(upload_to='question_images/')
    class_level = models.ForeignKey(ClassLevel, on_delete=models.SET_NULL, null=True, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True)
    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True)
    exam_type = models.ForeignKey(ExamType, on_delete=models.SET_NULL, null=True, blank=True)
    target_exam = models.ForeignKey(TargetExam, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Image - {self.subject.name if self.subject else 'Global'} - {self.created_at}"
