from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0040_alter_trackedcontract_contract_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="webhooksubscription",
            name="is_deleted",
            field=models.BooleanField(
                default=False,
                db_index=True,
                help_text="Soft delete flag: True when deleted, False when active",
            ),
        ),
        migrations.AddField(
            model_name="webhooksubscription",
            name="deleted_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Timestamp when the webhook was soft-deleted",
                null=True,
            ),
        ),
    ]
