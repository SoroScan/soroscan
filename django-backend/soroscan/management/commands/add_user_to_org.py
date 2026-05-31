"""
Management command: add_user_to_org

Add a user to an organization with a specified role.

Usage:
    python manage.py add_user_to_org --organization_slug="my-org" --user_username="john" --role="admin"
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from soroscan.ingest.models import Organization, OrganizationMembership


class Command(BaseCommand):
    help = "Add a user to an organization with a specified role."

    def add_arguments(self, parser):
        parser.add_argument(
            "--organization_slug",
            required=True,
            help="Organization slug",
        )
        parser.add_argument(
            "--user_username",
            required=True,
            help="Username of the user to add",
        )
        parser.add_argument(
            "--role",
            choices=["owner", "admin", "member"],
            default="member",
            help="Role to assign (default: member)",
        )

    def handle(self, *args, **options):
        organization_slug = options["organization_slug"]
        user_username = options["user_username"]
        role = options["role"]

        try:
            organization = Organization.objects.get(slug=organization_slug)
        except Organization.DoesNotExist:
            self.stderr.write(
                self.style.ERROR(f'Organization with slug "{organization_slug}" does not exist')
            )
            return

        User = get_user_model()
        try:
            user = User.objects.get(username=user_username)
        except User.DoesNotExist:
            self.stderr.write(
                self.style.ERROR(f'User with username "{user_username}" does not exist')
            )
            return

        # Check if the user is already a member of the organization
        if OrganizationMembership.objects.filter(organization=organization, user=user).exists():
            self.stderr.write(
                self.style.ERROR(
                    f'User "{user_username}" is already a member of organization "{organization_slug}"'
                )
            )
            return

        membership = OrganizationMembership.objects.create(
            organization=organization,
            user=user,
            role=role,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'User "{user_username}" added to organization "{organization_slug}" with role "{role}".'
            )
        )