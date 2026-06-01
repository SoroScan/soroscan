from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0026_merge_20260329_0027"),
    ]

    operations = [
        migrations.AddField(
            model_name="webhooksubscription",
            name="retry_interval_seconds",
            field=models.IntegerField(
                default=60,
                validators=[
                    django.core.validators.MinValueValidator(10),
                    django.core.validators.MaxValueValidator(3600),
                ],
                help_text="Minimum interval between retry attempts in seconds (10-3600, default: 60)",
            ),
        ),
    ]
