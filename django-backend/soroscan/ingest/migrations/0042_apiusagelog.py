from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("ingest", "0041_eventdeduplicationconfig"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="APIUsageLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("method", models.CharField(max_length=12)),
                ("endpoint", models.CharField(db_index=True, max_length=255)),
                ("path", models.CharField(max_length=512)),
                ("status_code", models.PositiveSmallIntegerField(db_index=True)),
                ("request_bytes", models.PositiveIntegerField(default=0)),
                ("response_bytes", models.PositiveIntegerField(default=0)),
                ("error_type", models.CharField(blank=True, db_index=True, max_length=64)),
                ("timestamp", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "api_key",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="usage_logs",
                        to="ingest.apikey",
                    ),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="api_usage_logs",
                        to="ingest.organization",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="api_usage_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-timestamp"],
                "indexes": [
                    models.Index(fields=["organization", "timestamp"], name="ingest_apiu_organiz_f4df26_idx"),
                    models.Index(fields=["organization", "endpoint", "timestamp"], name="ingest_apiu_organiz_7f7db3_idx"),
                    models.Index(fields=["organization", "error_type", "timestamp"], name="ingest_apiu_organiz_76c671_idx"),
                ],
            },
        ),
    ]
