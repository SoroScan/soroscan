from django.db import migrations


class Migration(migrations.Migration):
    """
    Merge migration: brings 0011_notification (Issue #137) into the main
    chain which runs 0011_data_retention → 0012 → 0013 → 0014.
    """

    dependencies = [
        ("ingest", "0011_notification"),
        ("ingest", "0014_teams_multichannel_alerts"),
    ]

    operations = []
