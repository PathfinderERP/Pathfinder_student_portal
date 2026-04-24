from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('master_data', '0045_librarypdf_description_librarypdf_thumbnail_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='targetexam',
            name='erp_id',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
    ]
