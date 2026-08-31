from django.db import migrations
import soroscan.ingest.fields

class Migration(migrations.Migration):

    dependencies = [
        ('ingest', '0053_webhook_replay_job'),
    ]

    operations = [
        migrations.AlterField(
            model_name='contractevent',
            name='payload',
            field=soroscan.ingest.fields.CompressedJSONField(help_text='Decoded event payload'),
        ),
    ]
