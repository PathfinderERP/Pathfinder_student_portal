from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('master_data', '0047_session_erp_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='classlevel',
            name='erp_id',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
    ]
