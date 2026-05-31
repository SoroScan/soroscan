"""
Management command: generate_invoice

Generate an invoice for an organization.

Usage:
    python manage.py generate_invoice --organization_slug="my-org" --amount_usd="100.00" --invoice_number="INV001" --period_start="2026-01-01" --period_end="2026-01-31" --due_date="2026-02-15"
"""
import json
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.utils.dateparse import parse_date

from soroscan.ingest.models import Invoice, Organization


class Command(BaseCommand):
    help = "Generate an invoice for an organization."

    def add_arguments(self, parser):
        parser.add_argument(
            "--organization_slug",
            required=True,
            help="Organization slug",
        )
        parser.add_argument(
            "--amount_usd",
            required=True,
            type=float,
            help="Invoice amount in USD",
        )
        parser.add_argument(
            "--invoice_number",
            required=True,
            help="Unique invoice number",
        )
        parser.add_argument(
            "--period_start",
            required=True,
            help="Start of billing period (YYYY-MM-DD)",
        )
        parser.add_argument(
            "--period_end",
            required=True,
            help="End of billing period (YYYY-MM-DD)",
        )
        parser.add_argument(
            "--due_date",
            required=True,
            help="Due date (YYYY-MM-DD)",
        )
        parser.add_argument(
            "--currency",
            default="USD",
            help="Currency code (default: USD)",
        )
        parser.add_argument(
            "--status",
            choices=[choice[0] for choice in Invoice.STATUS_CHOICES],
            default=Invoice.STATUS_DRAFT,
            help="Invoice status (default: draft)",
        )
        parser.add_argument(
            "--line_items",
            default="[]",
            help='JSON string representing line items (default: [])',
        )
        parser.add_argument(
            "--notes",
            default="",
            help="Optional notes",
        )

    def handle(self, *args, **options):
        organization_slug = options["organization_slug"]
        amount_usd = options["amount_usd"]
        invoice_number = options["invoice_number"]
        period_start_str = options["period_start"]
        period_end_str = options["period_end"]
        due_date_str = options["due_date"]
        currency = options["currency"]
        status = options["status"]
        line_items_str = options["line_items"]
        notes = options["notes"]

        # Parse dates
        period_start = parse_date(period_start_str)
        period_end = parse_date(period_end_str)
        due_date = parse_date(due_date_str)

        if period_start is None:
            raise CommandError(f'Invalid date format for period_start: {period_start_str}. Use YYYY-MM-DD.')
        if period_end is None:
            raise CommandError(f'Invalid date format for period_end: {period_end_str}. Use YYYY-MM-DD.')
        if due_date is None:
            raise CommandError(f'Invalid date format for due_date: {due_date_str}. Use YYYY-MM-DD.')

        # Parse line_items
        try:
            line_items = json.loads(line_items_str)
            if not isinstance(line_items, list):
                raise ValueError("line_items must be a JSON list")
        except json.JSONDecodeError:
            raise CommandError("line_items must be a valid JSON string")
        except ValueError as e:
            raise CommandError(f"Invalid line_items: {e}")

        try:
            organization = Organization.objects.get(slug=organization_slug)
        except Organization.DoesNotExist:
            raise CommandError(f'Organization with slug "{organization_slug}" does not exist')

        # Check if invoice_number is unique
        if Invoice.objects.filter(invoice_number=invoice_number).exists():
            raise CommandError(f'Invoice with number "{invoice_number}" already exists.')

        invoice = Invoice.objects.create(
            organization=organization,
            amount_usd=amount_usd,
            invoice_number=invoice_number,
            currency=currency,
            status=status,
            period_start=period_start,
            period_end=period_end,
            due_date=due_date,
            line_items=line_items,
            notes=notes,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Invoice "{invoice.invoice_number}" for organization "{organization.name}" created successfully.'
            )
        )