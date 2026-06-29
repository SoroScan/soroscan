from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("ingest", "0042_apiusagelog"),
    ]

    operations = [
        migrations.CreateModel(
            name="TransactionCost",
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
                ("tx_hash", models.CharField(max_length=64, unique=True)),
                (
                    "function_name",
                    models.CharField(blank=True, db_index=True, max_length=128),
                ),
                ("ledger_sequence", models.PositiveIntegerField()),
                ("total_fee_stroops", models.BigIntegerField()),
                ("cpu_instructions_used", models.BigIntegerField(default=0)),
                ("memory_bytes_used", models.BigIntegerField(default=0)),
                ("network_bytes_used", models.BigIntegerField(default=0)),
                (
                    "is_outlier",
                    models.BooleanField(db_index=True, default=False),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "contract",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="transaction_costs",
                        to="ingest.trackedcontract",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["contract", "-created_at"],
                        name="ingest_tran_contrac_6a6677_idx",
                    ),
                    models.Index(
                        fields=["function_name"],
                        name="ingest_tran_functio_3be0ea_idx",
                    ),
                    models.Index(
                        fields=["contract", "function_name", "created_at"],
                        name="ingest_tran_contrac_0f10c6_idx",
                    ),
                ],
            },
        ),
    ]
