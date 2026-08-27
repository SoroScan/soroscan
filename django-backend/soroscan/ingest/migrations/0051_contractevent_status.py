# Issue #1216 — add ContractEvent.status for ledger re-org handling

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0050_transactioncost"),
    ]

    operations = [
        migrations.AddField(
            model_name="contractevent",
            name="status",
            field=models.CharField(
                choices=[
                    ("CONFIRMED", "Confirmed"),
                    ("PENDING_REORG", "Pending Re-org"),
                    ("ORPHANED", "Orphaned"),
                ],
                db_index=True,
                default="CONFIRMED",
                help_text="Chain confirmation status (re-org detection)",
                max_length=16,
            ),
        ),
    ]
