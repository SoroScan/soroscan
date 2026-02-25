"""
Prometheus metrics for SoroScan.

Registers application-level metrics using prometheus_client.
Guards against duplicate registration so tests can import this module
multiple times without raising ``ValueError: Duplicated timeseries``.
"""
from prometheus_client import REGISTRY, Counter, Gauge, Histogram

__all__ = [
    "events_ingested_total",
    "task_duration_seconds",
    "active_contracts_gauge",
]


def _register_or_get(collector):
    """
    Register *collector* with the default REGISTRY.

    If a metric with the same name is already registered (e.g. during tests
    that import this module more than once), the existing collector is
    returned instead of raising an error.
    """
    try:
        REGISTRY.register(collector)
    except ValueError:
        # Already registered – return the existing one from the registry.
        for registered in REGISTRY._names_to_collectors.values():
            if registered is collector:
                return registered
        # Fallback: return the collector as-is (already registered elsewhere).
    return collector


events_ingested_total = _register_or_get(
    Counter(
        "soroscan_events_ingested_total",
        "Total number of contract events ingested",
        ["contract_id", "network", "event_type"],
    )
)

task_duration_seconds = _register_or_get(
    Histogram(
        "soroscan_task_duration_seconds",
        "Duration of Celery tasks in seconds",
        ["task_name"],
    )
)

active_contracts_gauge = _register_or_get(
    Gauge(
        "soroscan_tracked_contracts_active",
        "Number of currently active tracked contracts",
    )
)