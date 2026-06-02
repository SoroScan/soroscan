"""
Management command: create_organization

Creates a new organization with an owner.

Usage:
    python manage.py create_organization --name="My Org" --owner-email=owner@example.com
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from soroscan.ingest.models import Organization

User = get_user_model()


class Command(BaseCommand):
    help = "Create a new organization with an owner."

    def add_arguments(self, parser):
        parser.add_argument(
            "--name",
            required=True,
            help="Organization name",
        )
        parser.add_argument(
            "--owner-email",
            required=True,
            help="Email of the organization owner",
        )
        parser.add_argument(
            "--quota",
            type=int,
            default=0,
            help="Optional monthly event quota (0 = unlimited)",
        )

    def handle(self, *args, **options):
        name = options["name"]
        owner_email = options["owner_email"]
        quota = options["quota"]

        try:
            owner = User.objects.get(email=owner_email)
        except User.DoesNotExist:
            raise CommandError(f"User with email '{owner_email}' does not exist")

        # Check if organization with this name already exists
        if Organization.objects.filter(name=name).exists():
            raise CommandError(f"Organization '{name}' already exists")

        try:
            org = Organization.objects.create(
                name=name,
                owner=owner,
                quota=quota,
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Organization created successfully\n"
                    f"  ID: {org.id}\n"
                    f"  Name: {org.name}\n"
                    f"  Slug: {org.slug}\n"
                    f"  Owner: {owner.email}\n"
                    f"  Quota: {quota if quota > 0 else 'unlimited'}"
                )
            )
        except Exception as e:
            raise CommandError(f"Failed to create organization: {str(e)}")
