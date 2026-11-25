"""
Management command: export_contracts

Exports all TrackedContract records (address and name) to a JSON file.

Usage:
    python manage.py export_contracts --output contracts.json
    python manage.py export_contracts --output contracts.json --pretty
"""
import json
import sys

from django.core.management.base import BaseCommand

from soroscan.ingest.models import TrackedContract


class Command(BaseCommand):
    help = "Export all indexed contracts (address and name) to a JSON file."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            required=True,
            help="Output file path (use - for stdout)",
        )
        parser.add_argument(
            "--pretty",
            action="store_true",
            default=False,
            help="Pretty-print the JSON output",
        )

    def handle(self, *args, **options):
        output = options["output"]
        pretty = options["pretty"]
        indent = 2 if pretty else None

        contracts = list(
            TrackedContract.objects.values("contract_id", "name").order_by("contract_id")
        )

        data = {"contracts": contracts}

        if output == "-":
            json.dump(data, sys.stdout, indent=indent)
            sys.stdout.write("\n")
        else:
            with open(output, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=indent)

        self.stdout.write(
            self.style.SUCCESS(f"Exported {len(contracts)} contract(s) to {output}")
        )
