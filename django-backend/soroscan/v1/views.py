"""
Public v1 API views consumed by the TypeScript SDK.

These endpoints return the cursor-based pagination shape expected by
@soroscan/sdk while sourcing data from the ingest models.
"""
from __future__ import annotations

from django.db.models import Q
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from soroscan.ingest.models import ContractEvent, TrackedContract

from rest_framework.permissions import IsAuthenticated
from soroscan.ingest.models import WebhookDeadLetter
from soroscan.ingest.services.webhook_replay import create_replay_job


def _isoformat(value) -> str | None:
    if value is None:
        return None
    text = value.isoformat()
    if text.endswith("+00:00"):
        return text.replace("+00:00", "Z")
    return text


def _event_to_sdk(event: ContractEvent) -> dict:
    return {
        "id": str(event.id),
        "ledger": event.ledger,
        "ledgerClosedAt": _isoformat(event.timestamp),
        "txHash": event.tx_hash,
        "contractId": event.contract.contract_id,
        "type": event.event_type,
        "topics": [{"type": "symbol", "value": event.event_type}],
        "value": event.payload,
        "inSuccessfulContractCall": True,
        "pagingToken": f"{event.ledger}-{event.event_index}",
    }


def _contract_to_sdk(contract: TrackedContract) -> dict:
    return {
        "id": contract.contract_id,
        "network": contract.network,
        "type": "custom",
        "wasmHash": "",
        "creator": "",
        "createdAt": _isoformat(contract.created_at),
        "createdLedger": contract.last_indexed_ledger or 0,
        "lastActivityAt": _isoformat(contract.last_event_at),
        "totalEvents": contract.events.count(),
        "spec": None,
        "verified": False,
        "verifiedAt": None,
        "sourceCode": None,
        "label": contract.name,
    }


def _find_event_by_cursor(base_queryset, cursor: str) -> ContractEvent | None:
    if not cursor or not isinstance(cursor, str):
        return None
    cursor = cursor.strip()
    if not cursor:
        return None

    # 1. Paging token format: "<ledger>-<event_index>"
    if "-" in cursor:
        parts = cursor.split("-", 1)
        if parts[0].isdigit() and parts[1].isdigit():
            ledger = int(parts[0])
            idx = int(parts[1])
            ev = base_queryset.filter(ledger=ledger, event_index=idx).first()
            if ev:
                return ev
            ev = ContractEvent.objects.filter(ledger=ledger, event_index=idx).first()
            if ev:
                return ev

    # 2. Integer ID
    if cursor.isdigit():
        try:
            ev = base_queryset.filter(id=int(cursor)).first() or ContractEvent.objects.filter(id=int(cursor)).first()
            if ev:
                return ev
        except Exception:
            pass

    # 3. String / UUID ID
    try:
        ev = base_queryset.filter(id=cursor).first() or ContractEvent.objects.filter(id=cursor).first()
        if ev:
            return ev
    except Exception:
        pass

    # 4. ISO timestamp
    try:
        dt = parse_datetime(cursor)
        if dt:
            ev = base_queryset.filter(timestamp=dt).first() or ContractEvent.objects.filter(timestamp=dt).first()
            if ev:
                return ev
    except Exception:
        pass

    return None


@api_view(["GET"])
@permission_classes([AllowAny])
def list_events(request):
    """
    List contract events in the cursor-based shape expected by the TypeScript SDK.

    Query params:
    - first (int) - Maximum items to return, capped at 200 (default 20)
    - last (int) - Maximum items to return from end, capped at 200
    - contractId (string) - Filter by Soroban contract ID
    - eventType (string) - Filter by event type label
    - startLedger (int) - Filter events at or after this ledger
    - endLedger (int) - Filter events at or before this ledger
    - after (string) - Fetch events after this cursor (pagingToken)
    - before (string) - Fetch events before this cursor (pagingToken)

    - 200: Paginated event list with pageInfo cursors
    """
    after_cursor = request.query_params.get("after")
    before_cursor = request.query_params.get("before")

    last_param = request.query_params.get("last")
    is_last = False
    if last_param is not None:
        try:
            limit = min(int(last_param), 200)
            if limit < 1:
                limit = 20
            is_last = True
        except (TypeError, ValueError):
            limit = 20
    else:
        try:
            limit = min(int(request.query_params.get("first", 20)), 200)
            if limit < 1:
                limit = 20
        except (TypeError, ValueError):
            limit = 20

    base_qs = ContractEvent.objects.select_related("contract").order_by("-timestamp", "-id")

    contract_id = request.query_params.get("contractId")
    if contract_id:
        base_qs = base_qs.filter(contract__contract_id=contract_id)

    event_type = request.query_params.get("eventType")
    if event_type:
        base_qs = base_qs.filter(event_type=event_type)

    start_ledger = request.query_params.get("startLedger")
    if start_ledger is not None:
        try:
            base_qs = base_qs.filter(ledger__gte=int(start_ledger))
        except (ValueError, TypeError):
            pass

    end_ledger = request.query_params.get("endLedger")
    if end_ledger is not None:
        try:
            base_qs = base_qs.filter(ledger__lte=int(end_ledger))
        except (ValueError, TypeError):
            pass

    total = base_qs.count()

    ref_after = _find_event_by_cursor(base_qs, after_cursor) if after_cursor else None
    ref_before = _find_event_by_cursor(base_qs, before_cursor) if before_cursor else None

    if after_cursor and not ref_after:
        return Response(
            {
                "items": [],
                "pageInfo": {
                    "hasNextPage": False,
                    "hasPreviousPage": False,
                    "startCursor": None,
                    "endCursor": None,
                },
                "totalCount": total,
            }
        )

    if before_cursor and not ref_before:
        return Response(
            {
                "items": [],
                "pageInfo": {
                    "hasNextPage": False,
                    "hasPreviousPage": False,
                    "startCursor": None,
                    "endCursor": None,
                },
                "totalCount": total,
            }
        )

    queryset = base_qs
    has_previous_page = False
    has_next_page = False

    if ref_after:
        queryset = queryset.filter(
            Q(timestamp__lt=ref_after.timestamp)
            | Q(timestamp=ref_after.timestamp, id__lt=ref_after.id)
        )
        has_previous_page = base_qs.filter(
            Q(timestamp__gt=ref_after.timestamp)
            | Q(timestamp=ref_after.timestamp, id__gte=ref_after.id)
        ).exists()

    if ref_before:
        queryset = queryset.filter(
            Q(timestamp__gt=ref_before.timestamp)
            | Q(timestamp=ref_before.timestamp, id__gt=ref_before.id)
        )
        has_next_page = base_qs.filter(
            Q(timestamp__lt=ref_before.timestamp)
            | Q(timestamp=ref_before.timestamp, id__lte=ref_before.id)
        ).exists()

    if is_last:
        all_matches = list(queryset)
        if len(all_matches) > limit:
            has_previous_page = True
            events = all_matches[-limit:]
        else:
            events = all_matches
            if not ref_after:
                has_previous_page = False
    else:
        events_plus = list(queryset[:limit + 1])
        if len(events_plus) > limit:
            has_next_page = True
            events = events_plus[:limit]
        else:
            if not ref_before:
                has_next_page = False
            events = events_plus

    items = [_event_to_sdk(event) for event in events]

    return Response(
        {
            "items": items,
            "pageInfo": {
                "hasNextPage": has_next_page,
                "hasPreviousPage": has_previous_page,
                "startCursor": items[0]["pagingToken"] if items else None,
                "endCursor": items[-1]["pagingToken"] if items else None,
            },
            "totalCount": total,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def get_contract(request, contract_id: str):
    """
    Retrieve a single tracked contract for the TypeScript SDK.

    - 200: Contract metadata and activity summary
    - 404: Contract not found
    """
    try:
        contract = TrackedContract.objects.get(contract_id=contract_id)
    except TrackedContract.DoesNotExist:
        return Response(
            {"code": "NOT_FOUND", "message": "Contract not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(_contract_to_sdk(contract))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_replay_dead_letters(request):
    """
    Bulk replay dead-letter webhooks.
    Expected payload: {"dead_letter_ids": [1, 2, 3]}
    """
    dead_letter_ids = request.data.get("dead_letter_ids", [])
    if not isinstance(dead_letter_ids, list) or not dead_letter_ids:
        return Response(
            {"error": "A non-empty list of dead_letter_ids is required."}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    dead_letters = WebhookDeadLetter.objects.filter(id__in=dead_letter_ids, resolved=False).select_related('subscription', 'event')
    
    jobs_created = []
    for dl in dead_letters:
        if dl.event:
            # Leverage the existing replay job creation logic
            job = create_replay_job(
                subscription=dl.subscription,
                requested_by=request.user,
                contract_id=dl.subscription.contract.contract_id,
                event_type=dl.event.event_type,
                limit=1
            )
            jobs_created.append(job.pk)
            
            # Optionally mark as resolved or pending
            dl.resolved = True
            dl.resolution_note = f"Enqueued replay job {job.pk}"
            dl.save(update_fields=["resolved", "resolution_note"])

    return Response({
        "message": f"Successfully queued {len(jobs_created)} replay jobs.",
        "job_ids": jobs_created
    }, status=status.HTTP_202_ACCEPTED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def replay_dlq_webhooks(request):
    """
    Re-queue dead-lettered webhook deliveries in bulk (issue #1406).

    Accepts either an explicit ``delivery_ids`` list or a ``contract_id`` to
    replay every dead-lettered delivery for one contract:

    ``{"delivery_ids": [1, 2, 3]}`` or ``{"contract_id": "C..."}``

    The work is handed to the ``replay_dead_letter_webhooks`` Celery task and
    the request returns as soon as it is queued.
    """
    if not request.user.is_staff:
        return Response(
            {"error": "Admin access required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    from soroscan.ingest.tasks import replay_dead_letter_webhooks

    delivery_ids = request.data.get("delivery_ids")
    contract_id = request.data.get("contract_id")

    if delivery_ids is not None and not isinstance(delivery_ids, list):
        return Response(
            {"error": "delivery_ids must be a list of delivery log ids."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if contract_id is not None and not isinstance(contract_id, str):
        return Response(
            {"error": "contract_id must be a string."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not delivery_ids and not contract_id:
        return Response(
            {"error": "Provide either delivery_ids or contract_id."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    async_result = replay_dead_letter_webhooks.delay(
        delivery_ids=delivery_ids,
        contract_id=contract_id,
    )

    return Response(
        {
            "message": "Dead-letter replay queued.",
            "task_id": str(async_result.id),
            "delivery_ids": delivery_ids,
            "contract_id": contract_id,
        },
        status=status.HTTP_202_ACCEPTED,
    )
