"""
Management command: reset_api_key

Reset (rotate) an API key for a user.

Usage:
    python manage.py reset_api_key --user_username="john" --key_name="my-key"
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from soroscan.ingest.models import APIKey


class Command(BaseCommand):
    help = "Reset (rotate) an API key for a user."

    def add_arguments(self, parser):
        parser.add_argument(
            "--user_username",
            required=True,
            help="Username of the user who owns the API key",
        )
        parser.add_argument(
            "--key_name",
            required=True,
            help="Name of the API key to reset",
        )

    def handle(self, *args, **options):
        user_username = options["user_username"]
        key_name = options["key_name"]

        User = get_user_model()
        try:
            user = User.objects.get(username=user_username)
        except User.DoesNotExist:
            self.stderr.write(
                self.style.ERROR(f'User with username "{user_username}" does not exist')
            )
            return

        try:
            api_key = APIKey.objects.get(user=user, name=key_name)
        except APIKey.DoesNotExist:
            self.stderr.write(
                self.style.ERROR(
                    f'APIKey with name "{key_name}" for user "{user_username}" does not exist'
                )
            )
            return

        # Reset the key by setting it to empty string to trigger regeneration
        api_key.key = ""
        api_key.save()

        self.stdout.write(
            self.style.SUCCESS(
                f'APIKey "{api_key.name}" for user "{user_username}" has been reset. New key: {api_key.key}'
            )
        )