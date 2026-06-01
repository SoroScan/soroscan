from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0015_merge_notification_and_teams"),
    ]

    operations = [
        migrations.CreateModel(
            name="OrganizationUsage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("period_start", models.DateField(db_index=True, help_text="First day of the billing period (YYYY-MM-01)")),
                ("period_end", models.DateField(help_text="Last day of the billing period (inclusive)")),
                ("request_count", models.PositiveBigIntegerField(default=0, help_text="Total API requests made by this org in the period")),
                ("storage_bytes", models.PositiveBigIntegerField(default=0, help_text="Total bytes of event payload data stored for this org")),
                ("egress_bytes", models.PositiveBigIntegerField(default=0, help_text="Total bytes served to this org via API responses")),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "team",
                    models.ForeignKey(
                        help_text="Organization this usage record belongs to",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="usage_records",
                        to="ingest.team",
                    ),
                ),
            ],
            options={
                "ordering": ["-period_start"],
            },
        ),
        migrations.AddIndex(
            model_name="organizationusage",
            index=models.Index(fields=["team", "period_start"], name="ingest_orgusage_team_period_idx"),
        ),
        migrations.AlterUniqueTogether(
            name="organizationusage",
            unique_together={("team", "period_start")},
        ),
    ]
