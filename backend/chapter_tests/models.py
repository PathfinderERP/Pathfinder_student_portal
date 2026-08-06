from django.db import models

class ChapterTestResult(models.Model):
    student = models.ForeignKey('api.CustomUser', on_delete=models.CASCADE, related_name='chapter_test_results')
    subject_name = models.CharField(max_length=255)
    chapter_name = models.CharField(max_length=255)
    difficulty = models.CharField(max_length=100, blank=True, null=True)
    score = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=0)
    time_taken_seconds = models.IntegerField(default=0)
    responses = models.JSONField(default=dict, help_text="Detailed responses per question")
    question_data = models.JSONField(default=list, help_text="Snapshot of the questions")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.username} - {self.subject_name} - {self.chapter_name} ({self.score}/{self.total_questions})"
