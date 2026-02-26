# Generated migration for Contract State Snapshots feature

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ingest', '0009_contractevent_payload_gin'),
    ]

    operations = [
        migrations.CreateModel(
            name='ContractSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ledger_sequence', models.PositiveBigIntegerField(db_index=True, help_text='Ledger sequence at which this snapshot was captured')),
                ('state_data', models.JSONField(help_text='Complete contract state as JSON')),
                ('captured_at', models.DateTimeField(auto_now_add=True, help_text='Timestamp when snapshot was captured')),
                ('is_truncated', models.BooleanField(default=False, help_text='True if state_data was truncated due to size constraints (1 MB limit)')),
                ('is_compressed', models.BooleanField(default=False, help_text='True if state_data is compressed')),
                ('contract', models.ForeignKey(help_text='Contract this snapshot belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='snapshots', to='ingest.trackedcontract')),
            ],
            options={
                'ordering': ['-ledger_sequence'],
            },
        ),
        migrations.CreateModel(
            name='StateChange',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('field_name', models.CharField(db_index=True, help_text="Dot-notation path to the changed field (e.g., 'config.fee_rate')", max_length=255)),
                ('old_value', models.JSONField(blank=True, help_text='Previous value (null for field additions)', null=True)),
                ('new_value', models.JSONField(blank=True, help_text='New value (null for field deletions)', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Timestamp when change was recorded')),
                ('previous_snapshot', models.ForeignKey(blank=True, help_text='Previous snapshot for comparison', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='next_changes', to='ingest.contractsnapshot')),
                ('snapshot', models.ForeignKey(help_text='Snapshot where this change was detected', on_delete=django.db.models.deletion.CASCADE, related_name='changes', to='ingest.contractsnapshot')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='contractsnapshot',
            index=models.Index(fields=['contract', '-ledger_sequence'], name='ingest_cont_contrac_idx_snapshot'),
        ),
        migrations.AddConstraint(
            model_name='contractsnapshot',
            constraint=models.UniqueConstraint(fields=('contract', 'ledger_sequence'), name='unique_contract_ledger_snapshot'),
        ),
        migrations.AddIndex(
            model_name='statechange',
            index=models.Index(fields=['snapshot', 'field_name'], name='ingest_stat_snapsho_idx_change'),
        ),
    ]
