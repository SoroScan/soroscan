"""
Management command: import_contracts

Reads a JSON file with address/name mappings and creates TrackedContract records.
Skips contracts that already exist (by contract_id).

Usage:
    python manage.py import_contracts --file contracts.json

JSON format:
    {"contracts": [{"address": "C...", "name": "My Contract"}, ...]}
    or a top-level list: [{"address": "C...", "name": "My Contract"}, ...]
"""
import json

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from soroscan.ingest.models import TrackedContract

User = get_user_model()


class Command(BaseCommand):
    help = "Bulk import contracts from a JSON file (skips duplicates)."

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True, help="Path to JSON file")
        parser.add_argument(
            "--owner",
            default=None,
            help="Username to assign as owner (defaults to first superuser)",
        )

    def handle(self, *args, **options):
        file_path = options["file"]
        owner_username = options["owner"]

        try:
            with open(file_path, encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            raise CommandError(f"File not found: {file_path}")
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON: {exc}")

        contracts = data if isinstance(data, list) else data.get("contracts", [])
        if not isinstance(contracts, list):
            raise CommandError("JSON must be a list or an object with a 'contracts' list.")

        # Resolve owner
        if owner_username:
            try:
                owner = User.objects.get(username=owner_username)
            except User.DoesNotExist:
                raise CommandError(f"User '{owner_username}' not found.")
        else:
            owner = User.objects.filter(is_superuser=True).first()
            if owner is None:
                owner = User.objects.first()
            if owner is None:
                raise CommandError(
                    "No users exist. Create a user first or pass --owner."
                )

        created_count = 0
        skipped_count = 0

        for entry in contracts:
            address = entry.get("address") or entry.get("contract_id", "")
            name = entry.get("name", "")

            if not address:
                self.stderr.write(self.style.WARNING(f"Skipping entry with no address: {entry}"))
                skipped_count += 1
                continue

            _, created = TrackedContract.objects.get_or_create(
                contract_id=address,
                defaults={"name": name or address, "owner": owner},
            )
            if created:
                created_count += 1
                self.stdout.write(f"  Created: {address} ({name})")
            else:
                skipped_count += 1
                self.stdout.write(f"  Skipped (exists): {address}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created: {created_count}, Skipped: {skipped_count}"
            )
        )
