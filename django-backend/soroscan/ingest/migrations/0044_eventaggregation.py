from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("ingest", "0043_transactioncost"),
    ]

    operations = [
        migrations.CreateModel(
            name="EventAggregation",
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
                    "event_type",
                    models.CharField(db_index=True, max_length=128),
                ),
                (
                    "time_bucket",
                    models.DateTimeField(db_index=True),
                ),
                ("event_count", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "contract",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="event_aggregations",
                        to="ingest.trackedcontract",
                    ),
                ),
            ],
            options={
                "ordering": ["-time_bucket"],
                "indexes": [
                    models.Index(
                        fields=["contract", "time_bucket"],
                        name="ingest_even_contrac_6c3351_idx",
                    ),
                    models.Index(
                        fields=["event_type", "time_bucket"],
                        name="ingest_even_event_t_6ca77e_idx",
                    ),
                ],
                "unique_together": {("contract", "event_type", "time_bucket")},
            },
        ),
    ]
