from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("ingest", "0040_alter_trackedcontract_contract_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="EventDeduplicationConfig",
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
                (
                    "enabled",
                    models.BooleanField(
                        default=True,
                        help_text="Enable deduplication for this contract",
                    ),
                ),
                (
                    "fields",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="List of event fields (or special tokens) to include in dedup key",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
                (
                    "contract",
                    models.OneToOneField(
                        help_text="Contract this dedup config applies to",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dedup_config",
                        to="ingest.trackedcontract",
                    ),
                ),
            ],
            options={
                "verbose_name": "Event Deduplication Config",
                "verbose_name_plural": "Event Deduplication Configs",
            },
        ),
    ]
