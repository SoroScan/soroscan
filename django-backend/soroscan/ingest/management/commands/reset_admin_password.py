"""
Management command to reset the admin user password.

Usage:
    python manage.py reset_admin_password
    python manage.py reset_admin_password --username admin
    python manage.py reset_admin_password --password newpass123
"""
import getpass
import sys

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = "Reset the admin user password (prompts for new password if not provided)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            type=str,
            default="admin",
            help="Username to reset password for (default: admin)",
        )
        parser.add_argument(
            "--password",
            type=str,
            help="New password (if not provided, will prompt interactively)",
        )

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]

        # Try to get the user
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"User '{username}' does not exist.")
            )
            self.stdout.write(
                self.style.WARNING(
                    f"\nAvailable users: {', '.join(User.objects.values_list('username', flat=True))}"
                )
            )
            raise CommandError(f"User '{username}' not found.")

        # Get password if not provided
        if not password:
            if not sys.stdin.isatty():
                raise CommandError(
                    "Password must be provided via --password when running non-interactively"
                )

            self.stdout.write(
                self.style.WARNING(f"\nResetting password for user: {username}")
            )
            password = getpass.getpass("Enter new password: ")
            password_confirm = getpass.getpass("Confirm new password: ")

            if password != password_confirm:
                raise CommandError("Passwords do not match.")

            if not password:
                raise CommandError("Password cannot be empty.")

        # Update the password
        user.set_password(password)
        user.save()

        self.stdout.write(
            self.style.SUCCESS(f"\n✓ Password successfully updated for user '{username}'")
        )
