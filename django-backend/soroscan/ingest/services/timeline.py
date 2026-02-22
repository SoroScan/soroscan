"""Timeline grouping helpers for contract event history."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Iterable, Sequence
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.utils import timezone

from soroscan.ingest.models import ContractEvent


MAX_GROUP_LIMIT = 1000
DEFAULT_GROUP_LIMIT = 500
DEFAULT_WINDOW_HOURS = 24


@dataclass(frozen=True, slots=True)
class TimelineTypeCount:
    """Count summary for one event type inside a timeline group."""

    event_type: str
    count: int


@dataclass(slots=True)
class TimelineGroup:
    """Grouped events for a single bucket range."""

    start: datetime
    end: datetime
    event_count: int
    event_type_counts: list[TimelineTypeCount]
    events: list[ContractEvent] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class TimelineResult:
    """Timeline query result for a contract over a time window."""

    contract_id: str
    since: datetime
    until: datetime
    total_events: int
    groups: list[TimelineGroup]


@dataclass(slots=True)
class _MutableGroup:
    start: datetime
    end: datetime
    event_count: int = 0
    event_type_counts: dict[str, int] = field(default_factory=dict)
    events: list[ContractEvent] = field(default_factory=list)


def resolve_tz(timezone_name: str) -> ZoneInfo:
    """Resolve an IANA timezone name into a ZoneInfo object."""

    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as err:
        raise ValueError(f"Unsupported timezone: {timezone_name}") from err


def normalize_time_window(
    since: datetime | None,
    until: datetime | None,
) -> tuple[datetime, datetime]:
    """Normalize optional window bounds and ensure timezone-aware datetimes."""

    normalized_until = _ensure_aware(until) if until else timezone.now()
    normalized_since = _ensure_aware(since) if since else normalized_until - timedelta(hours=DEFAULT_WINDOW_HOURS)

    if normalized_since > normalized_until:
        raise ValueError("'since' must be before or equal to 'until'")

    return normalized_since, normalized_until


def clamp_group_limit(limit_groups: int) -> int:
    """Clamp timeline group limit to a safe bounded range."""

    if limit_groups <= 0:
        return 1
    return min(limit_groups, MAX_GROUP_LIMIT)


def build_timeline(
    *,
    contract_id: str,
    bucket_seconds: int,
    event_types: Sequence[str] | None,
    since: datetime | None,
    until: datetime | None,
    timezone_name: str,
    limit_groups: int = DEFAULT_GROUP_LIMIT,
    include_events: bool = False,
) -> TimelineResult:
    """Build grouped timeline data for a contract."""

    if bucket_seconds <= 0:
        raise ValueError("bucket_seconds must be greater than 0")

    selected_timezone = resolve_tz(timezone_name)
    normalized_since, normalized_until = normalize_time_window(since=since, until=until)
    bounded_group_limit = clamp_group_limit(limit_groups)

    queryset = (
        ContractEvent.objects.filter(
            contract__contract_id=contract_id,
            timestamp__gte=normalized_since,
            timestamp__lte=normalized_until,
        )
        .select_related("contract")
        .order_by("-timestamp", "-event_index")
    )

    if event_types:
        queryset = queryset.filter(event_type__in=event_types)

    events = list(queryset)
    grouped = _group_events(
        events=events,
        bucket_seconds=bucket_seconds,
        selected_timezone=selected_timezone,
        include_events=include_events,
    )

    groups = [
        TimelineGroup(
            start=item.start,
            end=item.end,
            event_count=item.event_count,
            event_type_counts=_sorted_type_counts(item.event_type_counts),
            events=item.events if include_events else [],
        )
        for item in grouped[:bounded_group_limit]
    ]

    return TimelineResult(
        contract_id=contract_id,
        since=normalized_since,
        until=normalized_until,
        total_events=len(events),
        groups=groups,
    )


def _group_events(
    *,
    events: Iterable[ContractEvent],
    bucket_seconds: int,
    selected_timezone: ZoneInfo,
    include_events: bool,
) -> list[_MutableGroup]:
    grouped: dict[datetime, _MutableGroup] = {}

    for event in events:
        bucket_start = floor_bucket_start(
            timestamp=event.timestamp,
            bucket_seconds=bucket_seconds,
            selected_timezone=selected_timezone,
        )
        current_group = grouped.get(bucket_start)
        if current_group is None:
            current_group = _MutableGroup(
                start=bucket_start,
                end=bucket_start + timedelta(seconds=bucket_seconds),
                event_type_counts=defaultdict(int),
            )
            grouped[bucket_start] = current_group

        current_group.event_count += 1
        current_group.event_type_counts[event.event_type] += 1

        if include_events:
            current_group.events.append(event)

    groups = sorted(grouped.values(), key=lambda item: item.start, reverse=True)

    if include_events:
        for group in groups:
            group.events.sort(key=lambda event: (event.timestamp, event.event_index), reverse=True)

    return groups


def floor_bucket_start(
    *,
    timestamp: datetime,
    bucket_seconds: int,
    selected_timezone: ZoneInfo,
) -> datetime:
    """Floor a timestamp to the configured bucket in the selected timezone."""

    if timezone.is_naive(timestamp):
        timestamp = timezone.make_aware(timestamp, UTC)

    localized = timestamp.astimezone(selected_timezone)

    if bucket_seconds == 86_400:
        return localized.replace(hour=0, minute=0, second=0, microsecond=0)
    if bucket_seconds == 3_600:
        return localized.replace(minute=0, second=0, microsecond=0)
    if bucket_seconds == 1_800:
        floored_minute = (localized.minute // 30) * 30
        return localized.replace(minute=floored_minute, second=0, microsecond=0)
    if bucket_seconds == 300:
        floored_minute = (localized.minute // 5) * 5
        return localized.replace(minute=floored_minute, second=0, microsecond=0)

    seconds_since_midnight = (
        localized.hour * 3600
        + localized.minute * 60
        + localized.second
    )
    floored_since_midnight = (seconds_since_midnight // bucket_seconds) * bucket_seconds
    hours = floored_since_midnight // 3600
    minutes = (floored_since_midnight % 3600) // 60
    seconds = floored_since_midnight % 60
    return localized.replace(hour=hours, minute=minutes, second=seconds, microsecond=0)


def _ensure_aware(value: datetime) -> datetime:
    if timezone.is_naive(value):
        return timezone.make_aware(value, UTC)
    return value


def _sorted_type_counts(counts: dict[str, int]) -> list[TimelineTypeCount]:
    ordered_items = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    return [TimelineTypeCount(event_type=event_type, count=count) for event_type, count in ordered_items]
