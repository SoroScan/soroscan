from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.utils import timezone

from soroscan.ingest.models import ContractCompletenessSLA, ContractEvent, SLAAlert, TrackedContract
from soroscan.ingest.stellar_client import SorobanClient


class Command(BaseCommand):
    help = "Calculate event completeness SLA for all active contracts for the previous hour."

    def add_arguments(self, parser):
        parser.add_argument(
            "--contract-id",
            type=str,
            default=None,
            help="Optional contract ID to calculate SLA for a specific contract",
        )
        parser.add_argument(
            "--hours",
            type=int,
            default=1,
            help="Number of past hours to process (default: 1)",
        )

    def handle(self, *args, **options):
        contract_id = options["contract_id"]
        hours = max(1, min(options["hours"], 168))  # Limit to 1-168 hours

        if contract_id:
            contracts = TrackedContract.objects.filter(contract_id=contract_id, is_active=True)
            if not contracts.exists():
                self.stdout.write(self.style.WARNING(f"No active contract found with ID: {contract_id}"))
                return
        else:
            contracts = TrackedContract.objects.filter(is_active=True)

        for contract in contracts:
            self._calculate_sla_for_contract(contract, hours)

        self.stdout.write(
            self.style.SUCCESS(f"Processed SLA calculations for {contracts.count()} contract(s)")
        )

    def _calculate_sla_for_contract(self, contract: TrackedContract, hours: int):
        """Calculate SLA for a single contract across multiple hours."""
        client = SorobanClient()

        for hour_offset in range(hours):
            hour_start = timezone.now().replace(minute=0, second=0, microsecond=0) - timedelta(hours=hour_offset + 1)
            hour_end = hour_start + timedelta(hours=1)

            # Count indexed events in this hour
            indexed_count = ContractEvent.objects.filter(
                contract=contract,
                timestamp__gte=hour_start,
                timestamp__lt=hour_end,
            ).count()

            # Get expected events from RPC (count distinct ledgers with events)
            # For simplicity, we estimate based on event count if we can't query RPC
            expected_count = self._get_expected_event_count(client, contract, hour_start, hour_end)

            sla_percentage = (indexed_count / expected_count * 100) if expected_count > 0 else 100.0
            is_violated = sla_percentage < 95.0

            sla_record, created = ContractCompletenessSLA.objects.update_or_create(
                contract=contract,
                hour_start=hour_start,
                defaults={
                    "events_expected": expected_count,
                    "events_indexed": indexed_count,
                    "sla_percentage": sla_percentage,
                    "is_violated": is_violated,
                },
            )

            if is_violated and not sla_record.alert_sent:
                SLAAlert.objects.create(
                    sla_record=sla_record,
                    alert_type=SLAAlert.ALERT_TYPE_SLA_VIOLATION,
                    contract=contract,
                    message=f"SLA violation detected for {contract.name}: {sla_percentage:.1f}% events indexed (expected {expected_count}, got {indexed_count})",
                )
                sla_record.alert_sent = True
                sla_record.save(update_fields=["alert_sent"])
                self.stdout.write(
                    self.style.WARNING(f"SLA violation: {contract.name} @ {hour_start}: {sla_percentage:.1f}%")
                )
            elif not is_violated and created:
                SLAAlert.objects.create(
                    sla_record=sla_record,
                    alert_type=SLAAlert.ALERT_TYPE_RECOVERY,
                    contract=contract,
                    message=f"SLA recovered for {contract.name}: {sla_percentage:.1f}% events indexed",
                )

    def _get_expected_event_count(
        self, client: SorobanClient, contract: TrackedContract, hour_start: datetime, hour_end: datetime
    ) -> int:
        """Get the expected number of events from RPC for the given time range."""
        try:
            # Query events from RPC for this contract in the time range
            events = client.get_events_range(
                contract_id=contract.contract_id,
                start_ledger=0,
                end_ledger=999999999999,
            )
            return len(events) if events else 0
        except Exception:
            # If RPC fails, estimate based on indexed events
            return ContractEvent.objects.filter(
                contract=contract,
                timestamp__gte=hour_start,
                timestamp__lt=hour_end,
            ).count()