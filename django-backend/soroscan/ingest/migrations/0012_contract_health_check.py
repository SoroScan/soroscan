# Migration for issue #110: Contract health checks
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0011_data_retention"),
    ]

    operations = [
        migrations.CreateModel(
            name="ContractHealthCheck",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "contract",
                    models.ForeignKey(
                        help_text="Contract this health snapshot belongs to",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="health_checks",
                        to="ingest.trackedcontract",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("healthy", "Healthy"),
                            ("degraded", "Degraded"),
                            ("unreachable", "Unreachable"),
                        ],
                        db_index=True,
                        default="healthy",
                        help_text="Overall health status of the contract at check time",
                        max_length=16,
                    ),
                ),
                ("last_ledger_on_chain", models.PositiveBigIntegerField(blank=True, help_text="Latest ledger sequence reported by the Soroban RPC at check time", null=True)),
                ("last_indexed_ledger", models.PositiveBigIntegerField(blank=True, help_text="Last ledger indexed for this contract at check time", null=True)),
                ("ledger_lag", models.IntegerField(default=0, help_text="Difference between last_ledger_on_chain and last_indexed_ledger (0 = in sync)")),
                ("rpc_reachable", models.BooleanField(default=True, help_text="Whether the Soroban RPC endpoint responded successfully")),
                ("error_detail", models.TextField(blank=True, help_text="Error message if the check failed or the contract is unreachable")),
                ("response_time_ms", models.FloatField(default=0.0, help_text="RPC round-trip time in milliseconds")),
                ("checked_at", models.DateTimeField(auto_now_add=True, db_index=True, help_text="UTC timestamp when this health check was performed")),
            ],
            options={
                "ordering": ["-checked_at"],
            },
        ),
        migrations.AddIndex(
            model_name="contracthealthcheck",
            index=models.Index(fields=["contract", "-checked_at"], name="ingest_health_contract_checked_idx"),
        ),
        migrations.AddIndex(
            model_name="contracthealthcheck",
            index=models.Index(fields=["status", "-checked_at"], name="ingest_health_status_checked_idx"),
        ),
    ]
