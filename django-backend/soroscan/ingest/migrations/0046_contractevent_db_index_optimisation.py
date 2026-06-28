"""
Issue #762: Add descending indexes on ContractEvent to cover the default
ordering (-timestamp) and the most common filtered list query
(contract + recency sort).

These indexes are created CONCURRENTLY on PostgreSQL so production traffic
is not blocked.  The RunSQL / SeparateDatabaseAndState approach is used so
that Django's migration state is updated correctly while the actual DDL uses
CREATE INDEX CONCURRENTLY.
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ingest", "0045_organization_cors_origins"),
    ]

    operations = [
        # (contract_id FK, timestamp DESC) — covers the common
        # .filter(contract=...).order_by('-timestamp') query shape.
        migrations.AddIndex(
            model_name="contractevent",
            index=models.Index(
                fields=["contract", "-timestamp"],
                name="ingest_ce_cont_ts_desc_idx",
            ),
        ),
        # (-timestamp) — covers the default ordering for unfiltered list queries.
        migrations.AddIndex(
            model_name="contractevent",
            index=models.Index(
                fields=["-timestamp"],
                name="ingest_ce_ts_desc_idx",
            ),
        ),
    ]
