# Generated migration for webhook replay functionality

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0038_dependencyimpactassessment_organizationbudget_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WebhookReplay",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("processing", "Processing"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                        ],
                        db_index=True,
                        default="pending",
                        help_text="Current replay status",
                        max_length=16,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True, db_index=True, help_text="When the replay was created"
                    ),
                ),
                (
                    "start_date",
                    models.DateTimeField(
                        blank=True,
                        help_text="Replay events from this date onwards (inclusive)",
                        null=True,
                    ),
                ),
                (
                    "end_date",
                    models.DateTimeField(
                        blank=True,
                        help_text="Replay events up to this date (inclusive)",
                        null=True,
                    ),
                ),
                (
                    "event_types",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="List of event types to filter by (empty = all types)",
                    ),
                ),
                (
                    "total_events",
                    models.PositiveIntegerField(
                        default=0, help_text="Total number of events matched by filters"
                    ),
                ),
                (
                    "replayed_events",
                    models.PositiveIntegerField(
                        default=0, help_text="Number of events successfully replayed"
                    ),
                ),
                (
                    "failed_events",
                    models.PositiveIntegerField(
                        default=0, help_text="Number of events that failed to replay"
                    ),
                ),
                (
                    "error_message",
                    models.TextField(
                        blank=True, help_text="Error details if status is 'failed'"
                    ),
                ),
                (
                    "started_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="When the replay task started processing",
                        null=True,
                    ),
                ),
                (
                    "completed_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="When the replay task finished",
                        null=True,
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        help_text="User who initiated the replay",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="webhook_replays",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "subscription",
                    models.ForeignKey(
                        help_text="Webhook subscription to replay events to",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="replays",
                        to="ingest.webhooksubscription",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="webhookreplay",
            index=models.Index(
                fields=["subscription", "status"], name="ingest_webh_subscri_6f8a9b_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="webhookreplay",
            index=models.Index(fields=["created_at"], name="ingest_webh_created_7f2e5c_idx"),
        ),
    ]
