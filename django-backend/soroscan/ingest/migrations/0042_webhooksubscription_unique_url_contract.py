from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0041_contractevent_contract_address"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="webhooksubscription",
            constraint=models.UniqueConstraint(
                fields=["target_url", "contract"],
                name="unique_webhook_url_contract",
            ),
        ),
    ]
