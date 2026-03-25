# Generated manually for issues #130–132

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("ingest", "0013_remediationincident_remediationrule_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Team",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=128)),
                ("slug", models.SlugField(max_length=160, unique=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_teams",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="TeamMembership",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "role",
                    models.CharField(
                        choices=[("admin", "Admin"), ("member", "Member")],
                        default="member",
                        max_length=16,
                    ),
                ),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                (
                    "team",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memberships", to="ingest.team"),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="team_memberships",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-joined_at"],
                "unique_together": {("team", "user")},
            },
        ),
        migrations.AddField(
            model_name="trackedcontract",
            name="team",
            field=models.ForeignKey(
                blank=True,
                help_text="Optional team scope for multi-tenant access",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="tracked_contracts",
                to="ingest.team",
            ),
        ),
        migrations.AddField(
            model_name="alertrule",
            name="channels",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Optional list of destinations: [{"type": "slack|email|webhook", "target": "..."}]. When non-empty, the rule fires to every channel in real time (same Celery task).',
            ),
        ),
        migrations.AlterField(
            model_name="alertrule",
            name="action_target",
            field=models.TextField(blank=True, help_text="Legacy single destination when channels is empty"),
        ),
        migrations.AddField(
            model_name="alertexecution",
            name="channel",
            field=models.CharField(
                blank=True,
                help_text="slack, email, webhook, or empty for legacy single-channel rows",
                max_length=32,
            ),
        ),
    ]
