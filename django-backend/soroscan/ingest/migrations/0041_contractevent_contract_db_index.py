from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ingest', '0040_alter_trackedcontract_contract_id'),
    ]

   operations = [
    migrations.AlterField(
        model_name='contractevent',
        name='contract',
        field=models.ForeignKey(
            help_text='The contract that emitted this event',
            on_delete=django.db.models.deletion.CASCADE,
            related_name='events',
            to='ingest.trackedcontract',
            db_index=True,
        ),
    ),
]
