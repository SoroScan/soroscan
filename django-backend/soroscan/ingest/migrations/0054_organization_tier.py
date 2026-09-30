# Generated for issue #1215 — organization subscription tier.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0053_webhook_replay_job"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="tier",
            field=models.CharField(
                choices=[
                    ("free", "Free"),
                    ("pro", "Pro"),
                    ("enterprise", "Enterprise"),
                ],
                db_index=True,
                default="free",
                max_length=16,
            ),
        ),
    ]
