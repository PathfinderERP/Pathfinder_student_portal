from django.db import models
import re

def generate_unique_code(model_class, name):
    # Create a base code: remove special chars, replace spaces with underscores, uppercase
    base_code = re.sub(r'[^a-zA-Z0-9\s]', '', name).strip().upper()
    base_code = re.sub(r'\s+', '_', base_code)
    
    code = base_code
    counter = 1
    # Check for uniqueness and append counter if necessary
    while model_class.objects.filter(code=code).exists():
        code = f"{base_code}_{counter}"
        counter += 1
    return code

class Session(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = generate_unique_code(Session, self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class TargetExam(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = generate_unique_code(TargetExam, self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class ExamType(models.Model):
    name = models.CharField(max_length=100)
    target_exam = models.ForeignKey(TargetExam, on_delete=models.SET_NULL, null=True, blank=True, related_name='exam_types')
    code = models.CharField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = generate_unique_code(ExamType, self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class ClassLevel(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = generate_unique_code(ClassLevel, self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class ExamDetail(models.Model):
    name = models.CharField(max_length=255, help_text="Exam Title", default='')
    code = models.CharField(max_length=100, help_text="Exam Code", default='')
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='exam_details')
    target_exam = models.ForeignKey(TargetExam, on_delete=models.SET_NULL, null=True, blank=True, related_name='exam_details')
    exam_type = models.ForeignKey(ExamType, on_delete=models.CASCADE, related_name='exam_details')
    class_level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='exam_details')
    duration = models.IntegerField(help_text="Duration in minutes")
    total_marks = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code and self.name:
            self.code = generate_unique_code(ExamDetail, self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.exam_type.name} - {self.class_level.name} ({self.session.name})"

class Subject(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            # Generate a short 3-letter code from the name
            # e.g., BIOLOGY -> BIO, MATHEMATICS -> MAT
            base_short = re.sub(r'[^a-zA-Z]', '', self.name).upper()[:3]
            self.code = generate_unique_code(Subject, base_short)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Topic(models.Model):
    class_level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='topics')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='topics')
    name = models.CharField(max_length=255, help_text="Topic Name")
    sub_topic = models.CharField(max_length=255, blank=True, null=True, help_text="Sub-topic (Optional)")
    code = models.CharField(max_length=100, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            # Generate a short code from topic name
            base_short = re.sub(r'[^a-zA-Z0-9]', '', self.name).upper()[:4]
            self.code = generate_unique_code(Topic, base_short)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.subject.name})"
