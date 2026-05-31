"""
Management command: create_organization

Creates a new organization.

Usage:
    python manage.py create_organization --name="My Org" --owner_username="john"
"""
import json

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from soroscan.ingest.models import Organization


class Command(BaseCommand):
    help = "Create a new organization."

    def add_arguments(self, parser):
        parser.add_argument(
            "--name",
            required=True,
            help="Organization name",
        )
        parser.add_argument(
            "--owner_username",
            required=True,
            help="Username of the organization owner",
        )
        parser.add_argument(
            "--slug",
            help="Organization slug (optional, generated from name if not provided)",
        )
        parser.add_argument(
            "--quota",
            type=int,
            default=0,
            help="Monthly event quota (default: 0)",
        )

    def handle(self, *args, **options):
        name = options["name"]
        owner_username = options["owner_username"]
        slug = options["slug"]
        quota = options["quota"]

        User = get_user_model()
        try:
            owner = User.objects.get(username=owner_username)
        except User.DoesNotExist:
            self.stderr.write(
                self.style.ERROR(f'User with username "{owner_username}" does not exist')
            )
            return

        if not slug:
            slug = slugify(name) or "organization"
            # Ensure slug is unique
            original_slug = slug
            n = 1
            while Organization.objects.filter(slug=slug).exists():
                slug = f"{original_slug}-{n}"
                n += 1

        organization = Organization.objects.create(
            name=name,
            slug=slug,
            owner=owner,
            quota=quota,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Organization "{organization.name}" (slug: {organization.slug}) created successfully.'
            )
        )