from django.db import migrations, models


def populate_contract_address(apps, schema_editor):
    ContractEvent = apps.get_model("ingest", "ContractEvent")
    for event in ContractEvent.objects.select_related("contract").iterator():
        event.contract_address = event.contract.contract_id
        event.save(update_fields=["contract_address"])


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0040_alter_trackedcontract_contract_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="contractevent",
            name="contract_address",
            field=models.CharField(
                db_index=True,
                default="",
                help_text="Denormalized contract address for fast address-based queries",
                max_length=56,
            ),
        ),
        migrations.RunPython(
            populate_contract_address,
            migrations.RunPython.noop,
        ),
    ]
