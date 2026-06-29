from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("ingest", "0044_eventaggregation"),
    ]

    operations = [
        migrations.CreateModel(
            name="SigningKey",
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
                ("key", models.CharField(max_length=255, unique=True)),
                (
                    "label",
                    models.CharField(
                        blank=True,
                        help_text="Human-readable label for this key",
                        max_length=128,
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(db_index=True, default=True),
                ),
                ("expires_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "subscription",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="signing_keys",
                        to="ingest.webhooksubscription",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["subscription", "is_active"],
                        name="ingest_sign_subscri_875e25_idx",
                    ),
                    models.Index(
                        fields=["expires_at"],
                        name="ingest_sign_expires_4ff03a_idx",
                    ),
                ],
            },
        ),
    ]
