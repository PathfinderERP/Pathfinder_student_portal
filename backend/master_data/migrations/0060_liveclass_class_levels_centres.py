from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('master_data', '0059_libraryitem_class_levels'),
        ('centres', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='liveclass',
            name='class_levels',
            field=models.ManyToManyField(blank=True, related_name='live_classes_multi', to='master_data.classlevel'),
        ),
        migrations.AddField(
            model_name='liveclass',
            name='centres',
            field=models.ManyToManyField(blank=True, related_name='live_classes', to='centres.centre'),
        ),
    ]
