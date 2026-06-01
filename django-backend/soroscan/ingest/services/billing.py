"""
Billing service: compute cost attribution per organization (issue #538).

Pricing constants (USD per unit) — override via Django settings if needed.
"""
import json
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.db.models import Sum

from ..models import ContractEvent, OrganizationUsage, Team

# --- Pricing rates (USD) ---
PRICE_PER_REQUEST = Decimal(getattr(settings, "BILLING_PRICE_PER_REQUEST", "0.000010"))   # $0.01 / 1000 requests
PRICE_PER_GB_STORAGE = Decimal(getattr(settings, "BILLING_PRICE_PER_GB_STORAGE", "0.023"))  # $0.023 / GB-month
PRICE_PER_GB_EGRESS = Decimal(getattr(settings, "BILLING_PRICE_PER_GB_EGRESS", "0.090"))   # $0.09 / GB

_GB = 1_073_741_824  # bytes in 1 GiB


def compute_costs(usage: OrganizationUsage) -> dict:
    """Return a dict of itemised and total costs (USD) for a usage record."""
    request_cost = PRICE_PER_REQUEST * usage.request_count
    storage_cost = PRICE_PER_GB_STORAGE * Decimal(usage.storage_bytes) / _GB
    egress_cost = PRICE_PER_GB_EGRESS * Decimal(usage.egress_bytes) / _GB
    total = request_cost + storage_cost + egress_cost
    return {
        "request_cost_usd": float(request_cost.quantize(Decimal("0.000001"))),
        "storage_cost_usd": float(storage_cost.quantize(Decimal("0.000001"))),
        "egress_cost_usd": float(egress_cost.quantize(Decimal("0.000001"))),
        "total_cost_usd": float(total.quantize(Decimal("0.000001"))),
    }


def snapshot_usage_for_team(team: Team, period_start: date, period_end: date) -> OrganizationUsage:
    """
    Compute and upsert an OrganizationUsage record for the given team and period.

    - request_count: number of ContractEvents in the period (proxy for API-driven ingestion)
    - storage_bytes: sum of JSON-serialised payload sizes for events in the period
    - egress_bytes:  same as storage_bytes (conservative estimate; real egress tracked via middleware)
    """
    qs = ContractEvent.objects.filter(
        contract__team=team,
        timestamp__date__gte=period_start,
        timestamp__date__lte=period_end,
    )

    request_count = qs.count()

    # Estimate storage as sum of serialised payload lengths
    storage_bytes = sum(
        len(json.dumps(e.payload).encode()) for e in qs.only("payload").iterator(chunk_size=500)
    )

    usage, _ = OrganizationUsage.objects.update_or_create(
        team=team,
        period_start=period_start,
        defaults={
            "period_end": period_end,
            "request_count": request_count,
            "storage_bytes": storage_bytes,
            "egress_bytes": storage_bytes,  # conservative default
        },
    )
    return usage
