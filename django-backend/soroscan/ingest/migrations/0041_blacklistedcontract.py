# Generated migration for BlacklistedContract model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0040_alter_trackedcontract_contract_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="BlacklistedContract",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("contract_id", models.CharField(db_index=True, help_text="Stellar contract address to block from indexing", max_length=56, unique=True)),
                ("reason", models.TextField(blank=True, help_text="Optional reason for blacklisting")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
