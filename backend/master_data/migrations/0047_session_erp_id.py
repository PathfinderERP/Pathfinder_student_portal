from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('master_data', '0046_targetexam_erp_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='erp_id',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
    ]
