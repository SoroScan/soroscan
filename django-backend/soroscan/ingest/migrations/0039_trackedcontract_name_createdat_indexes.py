# Generated manually for chore/django-admin-contract-list-usability
#
# Adds standalone indexes on TrackedContract.name and TrackedContract.created_at
# to support efficient ORDER BY in the Django Admin list view at 100+ contracts.
# Both operations are index-only adds — fully reversible with no data loss.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingest", "0038_dependencyimpactassessment_organizationbudget_and_more"),
    ]

    operations = [
        # Index on `name` — admin list is sortable by name; CharField ORDER BY
        # hits a seq scan without this at 100+ rows.
        migrations.AlterField(
            model_name="trackedcontract",
            name="name",
            field=models.CharField(
                db_index=True,
                max_length=100,
                help_text="Human-readable contract name",
            ),
        ),
        # Index on `created_at` — the default admin ordering is ["-created_at",
        # "name"], so every page load without a filter sorts by this column.
        # The existing composite indexes (contract_id+is_active, network+is_active)
        # do NOT cover a plain ORDER BY created_at.
        migrations.AlterField(
            model_name="trackedcontract",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                db_index=True,
            ),
        ),
    ]
