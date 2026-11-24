"""
Check ledger sequence integrity in ContractEvent table.

Scans the ContractEvent table for gaps in ledger_sequence to ensure
no ledger events have been missed during indexing.
"""
from django.core.management.base import BaseCommand
from django.db.models import Min, Max
from soroscan.ingest.models import ContractEvent


class Command(BaseCommand):
    help = "Check for gaps in ledger sequence in ContractEvent table"

    def add_arguments(self, parser):
        parser.add_argument(
            "--contract",
            type=int,
            help="Contract ID to check (if not provided, checks all contracts)",
        )
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Show detailed information about all found gaps",
        )
        parser.add_argument(
            "--event-type",
            type=str,
            help="Filter events by type before checking gaps",
        )

    def handle(self, *args, **options):
        contract_id = options.get("contract")
        verbose = options.get("verbose", False)
        event_type = options.get("event_type")

        # Build query
        query = ContractEvent.objects.all()
        if contract_id:
            query = query.filter(contract_id=contract_id)
        if event_type:
            query = query.filter(event_type=event_type)

        # Get ledger sequence range
        stats = query.aggregate(min_ledger=Min("ledger"), max_ledger=Max("ledger"))
        min_ledger = stats["min_ledger"]
        max_ledger = stats["max_ledger"]

        if min_ledger is None or max_ledger is None:
            self.stdout.write(
                self.style.WARNING("No events found in ContractEvent table")
            )
            return

        self.stdout.write(
            f"\nLedger Integrity Check Report"
            f"\n{'='*60}"
        )

        if contract_id:
            self.stdout.write(f"Contract ID: {contract_id}")
        if event_type:
            self.stdout.write(f"Event Type Filter: {event_type}")

        self.stdout.write(f"Ledger Range: {min_ledger:,} to {max_ledger:,}")
        self.stdout.write(f"Total Ledgers Spanned: {max_ledger - min_ledger + 1:,}")

        # Get all unique ledger sequences
        ledger_sequences = set(
            query.values_list("ledger", flat=True).distinct().order_by("ledger")
        )
        total_events = query.count()
        self.stdout.write(f"Total Events: {total_events:,}")
        self.stdout.write(f"Unique Ledgers with Events: {len(ledger_sequences):,}")

        # Find gaps
        gaps = self._find_gaps(min_ledger, max_ledger, ledger_sequences)

        if not gaps:
            self.stdout.write(
                self.style.SUCCESS(
                    "\n✓ No gaps found - ledger sequence is continuous!\n"
                )
            )
        else:
            self.stdout.write(
                self.style.ERROR(
                    f"\n✗ Found {len(gaps)} gap(s) in ledger sequence:\n"
                )
            )
            total_missing = 0
            for start, end in gaps:
                gap_size = end - start + 1
                total_missing += gap_size
                status_line = (
                    f"  Gap: Ledger {start:,} - {end:,} ({gap_size:,} missing)"
                )
                if verbose:
                    self.stdout.write(self.style.ERROR(status_line))
                else:
                    self.stdout.write(status_line)

            self.stdout.write("")
            self.stdout.write(
                self.style.ERROR(f"Total Missing Ledgers: {total_missing:,}")
            )
            self.stdout.write(
                self.style.ERROR(
                    f"Coverage: "
                    f"{(len(ledger_sequences) / (max_ledger - min_ledger + 1) * 100):.2f}%"
                )
            )

        self.stdout.write("")

    @staticmethod
    def _find_gaps(min_ledger, max_ledger, ledger_sequences):
        """
        Find gaps in ledger sequences.

        Args:
            min_ledger: Minimum ledger sequence
            max_ledger: Maximum ledger sequence
            ledger_sequences: Set of existing ledger sequences

        Returns:
            List of tuples (start, end) representing gap ranges
        """
        gaps = []
        expected = min_ledger

        while expected <= max_ledger:
            if expected not in ledger_sequences:
                # Start of a gap
                gap_start = expected
                while expected <= max_ledger and expected not in ledger_sequences:
                    expected += 1
                # Gap ends at expected - 1
                gaps.append((gap_start, expected - 1))
            else:
                expected += 1

        return gaps
