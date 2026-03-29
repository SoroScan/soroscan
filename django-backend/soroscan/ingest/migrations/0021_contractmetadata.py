# Generated migration for ContractMetadata

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ingest', '0020_trackedcontract_max_events_per_minute'),
    ]

    operations = [
        migrations.CreateModel(
            name='ContractMetadata',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Human-readable name (can differ from internal name)', max_length=256)),
                ('description', models.TextField(help_text='Detailed description of the contract')),
                ('tags', models.JSONField(default=list, help_text='List of strings for categorization')),
                ('documentation_url', models.URLField(blank=True, help_text='Link to external documentation')),
                ('github_repo', models.URLField(blank=True, help_text='Link to source code repository')),
                ('team_email', models.EmailField(blank=True, help_text='Contact email for the team', max_length=254)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('contract', models.OneToOneField(help_text='The contract this metadata belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='metadata', to='ingest.trackedcontract')),
            ],
        ),
    ]
