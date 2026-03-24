# Migration for issue #111: Transaction cost tracking and analytics
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0011_data_retention"),
    ]

    operations = [
        migrations.CreateModel(
            name="TransactionCost",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "contract",
                    models.ForeignKey(
                        help_text="Contract this transaction was invoked on",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="transaction_costs",
                        to="ingest.trackedcontract",
                    ),
                ),
                ("tx_hash", models.CharField(db_index=True, help_text="Transaction hash", max_length=64, unique=True)),
                ("function_name", models.CharField(blank=True, db_index=True, help_text="Contract function name (empty if unknown)", max_length=128)),
                ("ledger_sequence", models.PositiveIntegerField(db_index=True, help_text="Ledger sequence number")),
                ("total_fee_stroops", models.BigIntegerField(help_text="Total transaction fee in stroops (1 stroop = 1e-7 XLM)")),
                ("cpu_instructions_used", models.BigIntegerField(default=0, help_text="CPU instructions consumed by the Soroban host")),
                ("memory_bytes_used", models.BigIntegerField(default=0, help_text="Memory bytes consumed by the Soroban host")),
                ("network_bytes_used", models.BigIntegerField(default=0, help_text="Network bytes (read/write ledger entries) consumed")),
                ("is_outlier", models.BooleanField(db_index=True, default=False, help_text="True when total_fee_stroops is >2 std deviations from the function mean")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="CostAggregate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "contract",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="cost_aggregates",
                        to="ingest.trackedcontract",
                    ),
                ),
                ("function_name", models.CharField(blank=True, max_length=128)),
                ("period_start", models.DateTimeField(db_index=True, help_text="Start of the 1-hour aggregation window (UTC, truncated to hour)")),
                ("avg_fee_stroops", models.BigIntegerField(default=0)),
                ("min_fee_stroops", models.BigIntegerField(default=0)),
                ("max_fee_stroops", models.BigIntegerField(default=0)),
                ("total_fee_stroops", models.BigIntegerField(default=0)),
                ("call_count", models.PositiveIntegerField(default=0)),
                ("stddev_fee_stroops", models.FloatField(default=0.0, help_text="Population standard deviation of fees in this window")),
                ("computed_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-period_start"],
            },
        ),
        migrations.AddIndex(
            model_name="transactioncost",
            index=models.Index(fields=["contract", "-created_at"], name="ingest_txcost_contract_created_idx"),
        ),
        migrations.AddIndex(
            model_name="transactioncost",
            index=models.Index(fields=["function_name"], name="ingest_txcost_function_idx"),
        ),
        migrations.AddIndex(
            model_name="transactioncost",
            index=models.Index(fields=["contract", "function_name", "-created_at"], name="ingest_txcost_contract_fn_created_idx"),
        ),
        migrations.AlterUniqueTogether(
            name="costaggregate",
            unique_together={("contract", "function_name", "period_start")},
        ),
        migrations.AddIndex(
            model_name="costaggregate",
            index=models.Index(fields=["contract", "function_name", "-period_start"], name="ingest_costagg_contract_fn_period_idx"),
        ),
    ]
