"""
SC-8: Extended event emission views.

Provides:
  GET  /api/ingest/events/stream/          — Server-Sent Events live stream
  GET  /api/ingest/events/count-by-type/   — per-type annotated event counts
"""
from __future__ import annotations

import json
import logging
import time
from typing import Generator

from django.db.models import Count
from django.http import StreamingHttpResponse
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .cache_utils import get_cached_contract, stable_cache_key, get_or_set_json
from .models import ContractEvent, TrackedContract

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SC-8: Server-Sent Events stream
# ---------------------------------------------------------------------------

_SSE_PING_INTERVAL = 15  # seconds between keep-alive pings
_SSE_POLL_INTERVAL = 1   # seconds between DB polls
_SSE_MAX_EVENTS_PER_POLL = 50
_SSE_MAX_STREAM_SECONDS = 60  # max wall-clock time per connection (proxy-friendly)


def _sse_event(data: dict, event_name: str = "event") -> str:
    """Format a single SSE frame."""
    payload = json.dumps(data, default=str)
    return f"event: {event_name}\ndata: {payload}\n\n"


def _sse_ping() -> str:
    return f": ping {int(time.time())}\n\n"


def _stream_events(
    contract_id: str | None,
    event_type: str | None,
    since_id: int,
) -> Generator[str, None, None]:
    """
    Generator that polls ContractEvent and yields SSE frames.

    Uses a cursor (last-seen PK) so each poll only fetches new rows.
    Terminates after _SSE_MAX_STREAM_SECONDS to avoid holding DB connections
    indefinitely behind reverse proxies.
    """
    deadline = time.monotonic() + _SSE_MAX_STREAM_SECONDS
    cursor = since_id
    last_ping = time.monotonic()

    yield _sse_event(
        {"type": "connected", "cursor": cursor, "ts": timezone.now().isoformat()},
        event_name="connected",
    )

    while time.monotonic() < deadline:
        # Keep-alive ping
        if time.monotonic() - last_ping >= _SSE_PING_INTERVAL:
            yield _sse_ping()
            last_ping = time.monotonic()

        qs = ContractEvent.objects.select_related("contract").filter(id__gt=cursor)
        if contract_id:
            qs = qs.filter(contract__contract_id=contract_id)
        if event_type:
            qs = qs.filter(event_type=event_type)
        qs = qs.order_by("id")[: _SSE_MAX_EVENTS_PER_POLL]

        for event in qs:
            cursor = event.id
            yield _sse_event(
                {
                    "id": event.id,
                    "contract_id": event.contract.contract_id,
                    "contract_name": event.contract.name,
                    "event_type": event.event_type,
                    "payload": event.payload,
                    "ledger": event.ledger,
                    "event_index": event.event_index,
                    "tx_hash": event.tx_hash,
                    "timestamp": event.timestamp.isoformat(),
                    "schema_version": event.schema_version,
                    "validation_status": event.validation_status,
                    "signature_status": event.signature_status,
                },
            )

        time.sleep(_SSE_POLL_INTERVAL)

    # Signal graceful close
    yield _sse_event(
        {"type": "stream_end", "reason": "max_duration_reached"},
        event_name="stream_end",
    )


@extend_schema(
    summary="Stream contract events via Server-Sent Events (SC-8)",
    description=(
        "Opens a long-lived HTTP connection and pushes new `ContractEvent` rows "
        "as SSE frames in real time. Reconnect by passing the last received "
        "`id` as the `since_id` query parameter. "
        "Connections are closed after 60 seconds; clients must reconnect. "
        "Filter by `contract_id` and/or `event_type` to narrow the stream."
    ),
    parameters=[
        OpenApiParameter(
            "contract_id",
            str,
            description="Filter stream to a single contract address",
            required=False,
        ),
        OpenApiParameter(
            "event_type",
            str,
            description="Filter stream to a specific event type",
            required=False,
        ),
        OpenApiParameter(
            "since_id",
            int,
            description="Start streaming from events with id > this value (default: latest)",
            required=False,
        ),
    ],
    responses={200: {"type": "string", "description": "text/event-stream SSE response"}},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def event_stream_view(request):
    """
    GET /api/ingest/events/stream/

    Streams new ContractEvent rows as Server-Sent Events.
    Clients receive one JSON frame per event and a keep-alive ping every 15 s.
    """
    contract_id = request.query_params.get("contract_id") or None
    event_type = request.query_params.get("event_type") or None

    try:
        since_id = int(request.query_params.get("since_id", 0))
    except (TypeError, ValueError):
        since_id = 0

    # Default cursor = latest existing PK so we stream only future events
    if since_id == 0:
        latest = ContractEvent.objects.order_by("-id").values_list("id", flat=True).first()
        since_id = latest or 0

    response = StreamingHttpResponse(
        _stream_events(contract_id, event_type, since_id),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"  # Disable nginx buffering
    return response


# ---------------------------------------------------------------------------
# SC-8: Per-type annotated event counts
# ---------------------------------------------------------------------------


@extend_schema(
    summary="Per-event-type counts with schema version breakdown (SC-8)",
    description=(
        "Returns the count of indexed events grouped by event type. "
        "When `contract_id` is supplied the counts are scoped to that contract. "
        "The optional `include_schema_versions` flag adds a nested breakdown by "
        "`schema_version` so consumers can detect schema migrations at a glance. "
        "Results are cached for 60 seconds."
    ),
    parameters=[
        OpenApiParameter(
            "contract_id",
            str,
            description="Filter counts to a single contract address",
            required=False,
        ),
        OpenApiParameter(
            "include_schema_versions",
            bool,
            description="Include per-schema-version sub-counts (default false)",
            required=False,
        ),
    ],
    responses=inline_serializer(
        name="EventCountByTypeResponse",
        fields={
            "contract_id": serializers.CharField(allow_null=True),
            "total_events": serializers.IntegerField(),
            "counts": serializers.ListField(
                child=inline_serializer(
                    name="EventTypeCount",
                    fields={
                        "event_type": serializers.CharField(),
                        "count": serializers.IntegerField(),
                        "schema_versions": serializers.JSONField(required=False),
                    },
                )
            ),
        },
    ),
)
@api_view(["GET"])
@permission_classes([AllowAny])
def event_count_by_type_view(request):
    """
    GET /api/ingest/events/count-by-type/

    Returns per-event-type counts, optionally scoped to a contract and broken
    down by schema_version (SC-8).
    """
    contract_id = request.query_params.get("contract_id") or None
    include_schema_versions = (
        request.query_params.get("include_schema_versions", "false").lower()
        in ("true", "1", "yes")
    )

    # Validate contract if supplied
    contract = None
    if contract_id:
        contract = get_cached_contract(contract_id)
        if not contract:
            return Response(
                {"detail": f"Contract '{contract_id}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    cache_key = stable_cache_key(
        "sc8_event_count_by_type",
        {
            "contract_id": contract_id or "all",
            "include_schema_versions": include_schema_versions,
        },
    )

    def _build():
        qs = ContractEvent.objects.all()
        if contract:
            qs = qs.filter(contract=contract)

        # Base aggregation by event_type
        rows = (
            qs.values("event_type")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        counts = []
        for row in rows:
            entry: dict = {
                "event_type": row["event_type"],
                "count": row["count"],
            }
            if include_schema_versions:
                sv_qs = qs.filter(event_type=row["event_type"])
                sv_rows = (
                    sv_qs.values("schema_version")
                    .annotate(sv_count=Count("id"))
                    .order_by("schema_version")
                )
                entry["schema_versions"] = [
                    {
                        "schema_version": sv["schema_version"],
                        "count": sv["sv_count"],
                    }
                    for sv in sv_rows
                ]
            counts.append(entry)

        total = sum(r["count"] for r in counts)
        return {
            "contract_id": contract_id,
            "total_events": total,
            "counts": counts,
        }

    payload = get_or_set_json(cache_key, 60, _build)
    return Response(payload)
