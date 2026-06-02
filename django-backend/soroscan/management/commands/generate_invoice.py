"""
Management command: generate_invoice

Generates an invoice for an organization for a specific month.

Usage:
    python manage.py generate_invoice --org=my-org --month=2024-01 --output=invoice.csv
"""
from datetime import datetime, timezone
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError

from soroscan.ingest.models import Organization, OrganizationCostSnapshot


class Command(BaseCommand):
    help = "Generate an invoice for an organization for a specific month."

    def add_arguments(self, parser):
        parser.add_argument(
            "--org",
            required=True,
            help="Organization slug or ID",
        )
        parser.add_argument(
            "--month",
            required=True,
            help="Month in YYYY-MM format (e.g., 2024-01)",
        )
        parser.add_argument(
            "--output",
            required=True,
            help="Output file path (csv or json)",
        )

    def handle(self, *args, **options):
        org_identifier = options["org"]
        month_str = options["month"]
        output_path = options["output"]

        # Find organization
        try:
            org = Organization.objects.get(slug=org_identifier)
        except Organization.DoesNotExist:
            try:
                org = Organization.objects.get(id=int(org_identifier))
            except (Organization.DoesNotExist, ValueError):
                raise CommandError(f"Organization '{org_identifier}' not found")

        # Parse month
        try:
            month_date = datetime.strptime(month_str, "%Y-%m").date()
        except ValueError:
            raise CommandError(f"Invalid month format: {month_str}. Use YYYY-MM (e.g., 2024-01)")

        # Get cost snapshot
        snapshot = OrganizationCostSnapshot.objects.filter(
            organization=org,
            month=month_date,
        ).first()

        if not snapshot:
            raise CommandError(f"No cost data found for {org.name} for month {month_str}")

        # Generate invoice
        if output_path.endswith(".csv"):
            self._generate_csv(org, snapshot, output_path)
        elif output_path.endswith(".json"):
            self._generate_json(org, snapshot, output_path)
        else:
            raise CommandError("Output format must be .csv or .json")

        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Invoice generated successfully\n"
                f"  Organization: {org.name}\n"
                f"  Month: {month_str}\n"
                f"  Total Cost: ${snapshot.actual_cost_usd}\n"
                f"  Output: {output_path}"
            )
        )

    def _generate_csv(self, org, snapshot, output_path):
        """Generate invoice in CSV format."""
        import csv

        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)

            # Header
            writer.writerow(["SoroScan Invoice", ""])
            writer.writerow([])
            writer.writerow(["Organization", org.name])
            writer.writerow(["Month", snapshot.month.strftime("%B %Y")])
            writer.writerow(["Generated", datetime.now(timezone.utc).isoformat()])
            writer.writerow([])

            # Cost breakdown
            writer.writerow(["Cost Component", "Amount", "Percentage"])
            total = snapshot.rpc_cost_usd + snapshot.storage_cost_usd + snapshot.compute_cost_usd
            if total > 0:
                writer.writerow([
                    "RPC Calls",
                    f"${snapshot.rpc_cost_usd:.4f}",
                    f"{(snapshot.rpc_cost_usd / total * 100):.1f}%",
                ])
                writer.writerow([
                    "Storage",
                    f"${snapshot.storage_cost_usd:.4f}",
                    f"{(snapshot.storage_cost_usd / total * 100):.1f}%",
                ])
                writer.writerow([
                    "Compute",
                    f"${snapshot.compute_cost_usd:.4f}",
                    f"{(snapshot.compute_cost_usd / total * 100):.1f}%",
                ])
            writer.writerow([])

            # Summary
            writer.writerow(["TOTAL COST", f"${snapshot.actual_cost_usd:.2f}"])
            writer.writerow(["Projected Monthly Cost", f"${snapshot.projected_monthly_cost_usd:.2f}"])

    def _generate_json(self, org, snapshot, output_path):
        """Generate invoice in JSON format."""
        import json

        invoice = {
            "invoice_number": f"INV-{org.id}-{snapshot.month.strftime('%Y%m')}",
            "organization": {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
            },
            "period": {
                "month": snapshot.month.isoformat(),
                "display": snapshot.month.strftime("%B %Y"),
            },
            "usage": {
                "rpc_calls": snapshot.rpc_calls,
                "storage_bytes": snapshot.storage_bytes,
                "compute_units": snapshot.compute_units,
            },
            "costs": {
                "rpc_usd": float(snapshot.rpc_cost_usd),
                "storage_usd": float(snapshot.storage_cost_usd),
                "compute_usd": float(snapshot.compute_cost_usd),
                "total_usd": float(snapshot.actual_cost_usd),
                "projected_monthly_usd": float(snapshot.projected_monthly_cost_usd),
            },
            "breakdown": snapshot.breakdown,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(invoice, f, indent=2)
