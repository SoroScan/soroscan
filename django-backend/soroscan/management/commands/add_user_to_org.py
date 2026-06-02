"""
Management command: add_user_to_org

Adds a user to an organization with specified role.

Usage:
    python manage.py add_user_to_org --org=my-org --user-email=user@example.com --role=admin
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from soroscan.ingest.models import Organization, OrganizationMembership

User = get_user_model()


class Command(BaseCommand):
    help = "Add a user to an organization with a specific role."

    def add_arguments(self, parser):
        parser.add_argument(
            "--org",
            required=True,
            help="Organization slug or ID",
        )
        parser.add_argument(
            "--user-email",
            required=True,
            help="Email of the user to add",
        )
        parser.add_argument(
            "--role",
            required=True,
            choices=["owner", "admin", "member"],
            help="User role in the organization",
        )

    def handle(self, *args, **options):
        org_identifier = options["org"]
        user_email = options["user_email"]
        role = options["role"]

        # Find organization
        try:
            org = Organization.objects.get(slug=org_identifier)
        except Organization.DoesNotExist:
            try:
                org = Organization.objects.get(id=int(org_identifier))
            except (Organization.DoesNotExist, ValueError):
                raise CommandError(f"Organization '{org_identifier}' not found")

        # Find user
        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            raise CommandError(f"User with email '{user_email}' not found")

        # Check if membership already exists
        existing = OrganizationMembership.objects.filter(
            organization=org,
            user=user,
        ).first()

        if existing:
            # Update role if changed
            if existing.role != role:
                existing.role = role
                existing.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Updated membership\n"
                        f"  Organization: {org.name}\n"
                        f"  User: {user.email}\n"
                        f"  Role: {role}"
                    )
                )
            else:
                raise CommandError(
                    f"User '{user.email}' is already a {role} in organization '{org.name}'"
                )
        else:
            # Create new membership
            membership = OrganizationMembership.objects.create(
                organization=org,
                user=user,
                role=role,
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ User added to organization\n"
                    f"  Organization: {org.name}\n"
                    f"  User: {user.email}\n"
                    f"  Role: {role}\n"
                    f"  Joined: {membership.joined_at}"
                )
            )
