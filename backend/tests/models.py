from django.db import models
from master_data.models import Session, ExamType, ClassLevel, TargetExam
from centres.models import Centre

class Test(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    
    # Relationships to Master Data
    session = models.ForeignKey(Session, on_delete=models.SET_NULL, null=True, related_name='tests')
    target_exams = models.ManyToManyField(TargetExam, related_name='tests', blank=True)
    exam_type = models.ForeignKey(ExamType, on_delete=models.SET_NULL, null=True, related_name='tests')
    package = models.ForeignKey('packages.Package', on_delete=models.CASCADE, related_name='tests', null=True, blank=True)
    class_level = models.ForeignKey(ClassLevel, on_delete=models.SET_NULL, null=True, related_name='tests')
    
    # Allotment
    centres = models.ManyToManyField(Centre, related_name='tests', blank=True)
    
    duration = models.IntegerField(default=180, help_text="Duration in minutes")
    total_marks = models.IntegerField(default=0)
    description = models.TextField(blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    has_calculator = models.BooleanField(default=False)
    is_result_published = models.BooleanField(default=False)
    option_type_numeric = models.BooleanField(default=False, help_text="If True, options are 1,2,3,4")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class TestCentreAllotment(models.Model):
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='centre_allotments')
    centre = models.ForeignKey(Centre, on_delete=models.CASCADE, related_name='test_allotments')
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    access_code = models.CharField(max_length=6, blank=True, null=True, unique=True)
    is_code_sent = models.BooleanField(default=False)
    was_sent = models.BooleanField(default=False)
    code_history = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('test', 'centre')
        ordering = ['centre__name']

    def __str__(self):
        return f"{self.test.name} - {self.centre.name}"


class TestSubmission(models.Model):
    SUBMISSION_CHOICES = (
        ('MANUAL', 'Manual'),
        ('TIME_UP', 'Time Up'),
        ('VIOLATION', 'Violation Detection'),
    )
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey('api.CustomUser', on_delete=models.CASCADE, related_name='test_submissions')
    responses = models.JSONField(default=dict)
    submission_type = models.CharField(max_length=20, choices=SUBMISSION_CHOICES, default='MANUAL')
    time_spent = models.IntegerField(default=0, help_text="Total time spent in seconds")
    score = models.FloatField(default=0.0)
    is_finalized = models.BooleanField(default=False, help_text="Set to True when student manually submits")
    allow_resume = models.BooleanField(default=False, help_text="Admin must set to True to allow student to resume an interrupted session")
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Ensures a student can only submit once for a given test
        unique_together = ('test', 'student')
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.student.username} - {self.test.name} ({self.score})"
