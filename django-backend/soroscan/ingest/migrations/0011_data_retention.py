# Generated migration for data retention policies and archival models
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0010_merge_invocation_and_gin"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DataRetentionPolicy",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("retention_days", models.PositiveIntegerField(default=365, help_text="Events older than this many days will be archived")),
                ("archive_enabled", models.BooleanField(default=True, help_text="When False, events are pruned without archiving to S3")),
                ("s3_bucket", models.CharField(max_length=255, help_text="S3 bucket name for archived event batches")),
                ("s3_prefix", models.CharField(blank=True, default="soroscan/archives/", max_length=255, help_text="Key prefix inside the S3 bucket")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "contract",
                    models.OneToOneField(
                        blank=True,
                        help_text="Leave blank for a global default policy",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="retention_policy",
                        to="ingest.trackedcontract",
                    ),
                ),
            ],
            options={
                "verbose_name": "Data Retention Policy",
                "verbose_name_plural": "Data Retention Policies",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ArchivedEventBatch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("s3_key", models.CharField(max_length=512, unique=True, help_text="Full S3 object key for this batch")),
                ("event_count", models.IntegerField(help_text="Number of events in this batch")),
                ("size_bytes", models.BigIntegerField(default=0, help_text="Compressed size of the S3 object in bytes")),
                ("min_timestamp", models.DateTimeField(blank=True, null=True, help_text="Earliest event timestamp in this batch")),
                ("max_timestamp", models.DateTimeField(blank=True, null=True, help_text="Latest event timestamp in this batch")),
                ("status", models.CharField(
                    choices=[("archived", "Archived"), ("restored", "Restored")],
                    db_index=True,
                    default="archived",
                    max_length=16,
                )),
                ("archived_at", models.DateTimeField(auto_now_add=True)),
                (
                    "policy",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="batches",
                        to="ingest.dataretentionpolicy",
                    ),
                ),
            ],
            options={
                "ordering": ["-archived_at"],
                "indexes": [
                    models.Index(fields=["policy", "archived_at"], name="ingest_arch_policy_archived_idx"),
                    models.Index(fields=["status"], name="ingest_arch_status_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="ArchivalAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(
                    choices=[("archive", "Archive"), ("restore", "Restore")],
                    db_index=True,
                    max_length=16,
                )),
                ("event_count", models.IntegerField(default=0)),
                ("detail", models.TextField(blank=True, help_text="Extra context or error message")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "batch",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="audit_logs",
                        to="ingest.archivedeventbatch",
                    ),
                ),
                (
                    "policy",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="audit_logs",
                        to="ingest.dataretentionpolicy",
                    ),
                ),
                (
                    "performed_by",
                    models.ForeignKey(
                        blank=True,
                        help_text="User who triggered a restore (null for automated archival)",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
