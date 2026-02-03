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

class Chapter(models.Model):
    class_level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='chapters')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='chapters')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True, blank=True)
    sort_order = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            base_short = re.sub(r'[^a-zA-Z0-9]', '', self.name).upper()[:4]
            self.code = generate_unique_code(Chapter, base_short)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.subject.name} - {self.class_level.name})"

class Topic(models.Model):
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='topics', null=True, blank=True)
    class_level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='topics')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='topics')
    name = models.CharField(max_length=255, help_text="Topic Name")
    code = models.CharField(max_length=100, unique=True, blank=True)
    sort_order = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            base_short = re.sub(r'[^a-zA-Z0-9]', '', self.name).upper()[:4]
            self.code = generate_unique_code(Topic, base_short)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.subject.name})"

class SubTopic(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='subtopics')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True, blank=True)
    sort_order = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            base_short = re.sub(r'[^a-zA-Z0-9]', '', self.name).upper()[:4]
            self.code = generate_unique_code(SubTopic, base_short)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.topic.name})"

class Teacher(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    qualification = models.CharField(max_length=255, blank=True, null=True)
    experience = models.CharField(max_length=100, blank=True, null=True)
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='teachers')
    code = models.CharField(max_length=50, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = generate_unique_code(Teacher, self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class LibraryItem(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    thumbnail = models.ImageField(upload_to='library/thumbnails/', blank=True, null=True)
    pdf_file = models.FileField(upload_to='library/pdfs/', blank=True, null=True)
    
    # Master Data Links
    session = models.ForeignKey(Session, on_delete=models.SET_NULL, null=True, blank=True, related_name='library_items')
    class_level = models.ForeignKey(ClassLevel, on_delete=models.SET_NULL, null=True, blank=True, related_name='library_items')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='library_items')
    exam_type = models.ForeignKey(ExamType, on_delete=models.SET_NULL, null=True, blank=True, related_name='library_items')
    target_exam = models.ForeignKey(TargetExam, on_delete=models.SET_NULL, null=True, blank=True, related_name='library_items')

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class SolutionItem(models.Model):
    # Core Details
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Master Data Links
    session = models.ForeignKey(Session, on_delete=models.SET_NULL, null=True, blank=True, related_name='solutions')
    class_level = models.ForeignKey(ClassLevel, on_delete=models.SET_NULL, null=True, blank=True, related_name='solutions')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='solutions')
    exam_type = models.ForeignKey(ExamType, on_delete=models.SET_NULL, null=True, blank=True, related_name='solutions')
    target_exam = models.ForeignKey(TargetExam, on_delete=models.SET_NULL, null=True, blank=True, related_name='solutions')
    sections = models.ManyToManyField('sections.Section', related_name='solutions', blank=True)

    # Resource Categories (Stored as comma-separated or similar, handled in frontend)
    resource_type_dpp = models.BooleanField(default=False)
    resource_type_rpp = models.BooleanField(default=False)
    resource_type_others = models.BooleanField(default=False)
    other_resource_name = models.CharField(max_length=100, blank=True, null=True)

    # Question Part
    question_title = models.CharField(max_length=255, blank=True, null=True)
    question_thumbnail = models.ImageField(upload_to='solutions/thumbnails/questions/', blank=True, null=True)
    question_pdf = models.FileField(upload_to='solutions/pdfs/questions/', blank=True, null=True)

    # Answer Part
    answer_title = models.CharField(max_length=255, blank=True, null=True)
    answer_thumbnail = models.ImageField(upload_to='solutions/thumbnails/answers/', blank=True, null=True)
    answer_pdf = models.FileField(upload_to='solutions/pdfs/answers/', blank=True, null=True)

    # Legacy field (keeping it for safety or migrating later, but we'll use the new ones)
    thumbnail = models.ImageField(upload_to='solutions/thumbnails/', blank=True, null=True)
    pdf_file = models.FileField(upload_to='solutions/pdfs/', blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Notice(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    file_attachment = models.FileField(upload_to='notices/', blank=True, null=True)
    
    # Master Data Links
    session = models.ForeignKey(Session, on_delete=models.SET_NULL, null=True, blank=True, related_name='notices')
    class_level = models.ForeignKey(ClassLevel, on_delete=models.SET_NULL, null=True, blank=True, related_name='notices')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='notices')
    exam_type = models.ForeignKey(ExamType, on_delete=models.SET_NULL, null=True, blank=True, related_name='notices')
    target_exam = models.ForeignKey(TargetExam, on_delete=models.SET_NULL, null=True, blank=True, related_name='notices')

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
