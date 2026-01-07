from django.db import models

class UploadedFile(models.Model):
    title = models.CharField(max_length=255)
    # This will upload to Cloudflare R2 if configured, and save the path in MongoDB
    file = models.FileField(upload_to='uploads/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
