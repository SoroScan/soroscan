# Merge migration: combines #111 transaction cost analytics with upstream
# notification/teams/adminaction migrations.
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0012_transaction_cost_analytics"),
        ("ingest", "0015_merge_notification_and_teams"),
    ]

    operations = []
