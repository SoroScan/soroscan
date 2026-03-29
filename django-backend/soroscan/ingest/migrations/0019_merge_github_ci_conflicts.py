# Generated merge migration to resolve GitHub CI conflicts

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0018_merge_0016_add_ingesterror_0017_eventdeduplicationlog"),
        ("ingest", "0024_merge_20260328_1903"),
    ]

    operations = []
