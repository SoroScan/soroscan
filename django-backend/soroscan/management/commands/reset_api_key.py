"""
Management command: reset_api_key

Rotates an existing API key, deactivating the old one and generating a new one.

Usage:
    python manage.py reset_api_key --key-name="My Key" --user-email=user@example.com
"""
import secrets

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from soroscan.ingest.models import APIKey

User = get_user_model()


class Command(BaseCommand):
    help = "Rotate an API key by deactivating the old one and generating a new one."

    def add_arguments(self, parser):
        parser.add_argument(
            "--key-name",
            required=True,
            help="Name of the API key to rotate",
        )
        parser.add_argument(
            "--user-email",
            required=True,
            help="Email of the API key owner",
        )

    def handle(self, *args, **options):
        key_name = options["key_name"]
        user_email = options["user_email"]

        # Find user
        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            raise CommandError(f"User with email '{user_email}' not found")

        # Find API key
        try:
            old_key = APIKey.objects.get(name=key_name, user=user)
        except APIKey.DoesNotExist:
            raise CommandError(f"API key '{key_name}' not found for user '{user_email}'")

        # Ask for confirmation
        self.stdout.write(self.style.WARNING("⚠ This action will rotate the API key."))
        self.stdout.write(f"  Current key (masked): {old_key.key[:8]}...{old_key.key[-4:]}")
        confirm = input("Are you sure? (yes/no): ")

        if confirm.lower() != "yes":
            raise CommandError("Operation cancelled")

        # Deactivate old key
        old_key_value = old_key.key
        old_key.is_active = False
        old_key.save()

        # Generate new key
        new_key = APIKey.objects.create(
            user=user,
            name=f"{key_name} (rotated)",
            team=old_key.team,
            tier=old_key.tier,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"✓ API key rotated successfully\n"
                f"  User: {user.email}\n"
                f"  Old key (deactivated): {old_key_value[:12]}...{old_key_value[-4:]}\n"
                f"  New key: {new_key.key}\n"
                f"  Tier: {new_key.tier}\n"
                f"  Quota: {new_key.quota_per_hour} req/hour"
            )
        )
