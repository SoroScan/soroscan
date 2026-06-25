from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ingest", "0044_contractevent_payload_compression"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="cors_origins",
            field=models.JSONField(default=list, blank=True, help_text="List of allowed CORS origins for this organization"),
        ),
    ]
