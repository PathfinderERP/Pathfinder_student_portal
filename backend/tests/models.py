from django.db import models
from master_data.models import Session, ExamType, ClassLevel, TargetExam
from centres.models import Centre

class Test(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    
    # Relationships to Master Data
    session = models.ForeignKey(Session, on_delete=models.SET_NULL, null=True, related_name='tests')
    target_exam = models.ForeignKey(TargetExam, on_delete=models.SET_NULL, null=True, related_name='tests')
    exam_type = models.ForeignKey(ExamType, on_delete=models.SET_NULL, null=True, related_name='tests')
    class_level = models.ForeignKey(ClassLevel, on_delete=models.SET_NULL, null=True, related_name='tests')
    
    # Allotment
    centres = models.ManyToManyField(Centre, related_name='tests', blank=True)
    allotted_sections = models.ManyToManyField('sections.Section', related_name='allotted_tests', blank=True)
    
    duration = models.IntegerField(default=180, help_text="Duration in minutes")
    total_marks = models.IntegerField(default=0)
    description = models.TextField(blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    has_calculator = models.BooleanField(default=False)
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('test', 'centre')
        ordering = ['centre__name']

    def __str__(self):
        return f"{self.test.name} - {self.centre.name}"
