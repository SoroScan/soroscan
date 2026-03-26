"""
Migration: Notification model for the in-app notification center (Issue #137).
"""
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0010_merge_invocation_and_gin"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                (
                    "notification_type",
                    models.CharField(
                        choices=[
                            ("contract_paused", "Contract Paused"),
                            ("webhook_failure", "Webhook Failure"),
                            ("rate_limit", "Rate Limit Warning"),
                            ("system", "System"),
                            ("alert", "Alert"),
                        ],
                        db_index=True,
                        max_length=32,
                    ),
                ),
                ("title", models.CharField(max_length=256)),
                ("message", models.TextField()),
                ("link", models.CharField(blank=True, max_length=512)),
                ("is_read", models.BooleanField(db_index=True, default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(
                fields=["user", "is_read", "created_at"],
                name="ingest_notification_user_read_created_idx",
            ),
        ),
    ]
