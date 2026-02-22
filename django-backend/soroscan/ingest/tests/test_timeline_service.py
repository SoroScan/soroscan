from datetime import UTC, datetime

import pytest
from django.utils import timezone

from soroscan.ingest.services.timeline import build_timeline, clamp_group_limit

from .factories import ContractEventFactory, TrackedContractFactory, UserFactory


@pytest.mark.django_db
class TestTimelineService:
    def test_group_limit_is_clamped(self):
        assert clamp_group_limit(0) == 1
        assert clamp_group_limit(2000) == 1000

    def test_groups_events_into_five_minute_buckets(self):
        user = UserFactory()
        contract = TrackedContractFactory(owner=user)

        ContractEventFactory(
            contract=contract,
            event_type="transfer",
            timestamp=timezone.make_aware(datetime(2024, 2, 19, 20, 1, 0), UTC),
            ledger=2000,
            event_index=0,
        )
        ContractEventFactory(
            contract=contract,
            event_type="transfer",
            timestamp=timezone.make_aware(datetime(2024, 2, 19, 20, 4, 0), UTC),
            ledger=2001,
            event_index=0,
        )
        ContractEventFactory(
            contract=contract,
            event_type="approve",
            timestamp=timezone.make_aware(datetime(2024, 2, 19, 20, 6, 0), UTC),
            ledger=2002,
            event_index=0,
        )

        timeline = build_timeline(
            contract_id=contract.contract_id,
            bucket_seconds=300,
            event_types=None,
            since=timezone.make_aware(datetime(2024, 2, 19, 20, 0, 0), UTC),
            until=timezone.make_aware(datetime(2024, 2, 19, 20, 10, 0), UTC),
            timezone_name="UTC",
            include_events=True,
        )

        assert timeline.total_events == 3
        assert len(timeline.groups) == 2
        assert timeline.groups[0].event_count == 1
        assert timeline.groups[0].event_type_counts[0].event_type == "approve"
        assert timeline.groups[1].event_count == 2
        assert timeline.groups[1].event_type_counts[0].event_type == "transfer"

    def test_filters_by_event_type(self):
        user = UserFactory()
        contract = TrackedContractFactory(owner=user)
        current_time = timezone.now()

        ContractEventFactory(contract=contract, event_type="transfer", timestamp=current_time)
        ContractEventFactory(contract=contract, event_type="burn", timestamp=current_time)

        timeline = build_timeline(
            contract_id=contract.contract_id,
            bucket_seconds=1800,
            event_types=["transfer"],
            since=None,
            until=None,
            timezone_name="UTC",
            include_events=True,
        )

        assert timeline.total_events == 1
        assert len(timeline.groups) == 1
        assert timeline.groups[0].event_type_counts[0].event_type == "transfer"

    def test_include_events_false_returns_empty_event_lists(self):
        user = UserFactory()
        contract = TrackedContractFactory(owner=user)
        ContractEventFactory(
            contract=contract,
            event_type="transfer",
            timestamp=timezone.now(),
        )

        timeline = build_timeline(
            contract_id=contract.contract_id,
            bucket_seconds=3600,
            event_types=None,
            since=None,
            until=None,
            timezone_name="UTC",
            include_events=False,
        )

        assert timeline.total_events == 1
        assert timeline.groups[0].events == []

    def test_invalid_timezone_raises_error(self):
        user = UserFactory()
        contract = TrackedContractFactory(owner=user)

        with pytest.raises(ValueError, match="Unsupported timezone"):
            build_timeline(
                contract_id=contract.contract_id,
                bucket_seconds=3600,
                event_types=None,
                since=None,
                until=None,
                timezone_name="Invalid/Timezone",
                include_events=False,
            )

    def test_since_after_until_raises_error(self):
        user = UserFactory()
        contract = TrackedContractFactory(owner=user)

        with pytest.raises(ValueError, match="'since' must be before or equal to 'until'"):
            build_timeline(
                contract_id=contract.contract_id,
                bucket_seconds=3600,
                event_types=None,
                since=timezone.now(),
                until=timezone.now() - timezone.timedelta(hours=1),
                timezone_name="UTC",
                include_events=False,
            )
