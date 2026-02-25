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


def _get_or_create(metric_cls, name, documentation, labelnames=()):
    """
    Return an existing collector from REGISTRY if one with *name* is already
    registered, otherwise create and register a new one.

    The key insight: we check the registry BEFORE constructing the metric
    object.  Constructing a prometheus_client metric auto-registers it, so
    we must avoid constructing a second instance at all.
    """
    # prometheus_client stores metrics under several derived names
    # (e.g. "foo", "foo_total", "foo_created" for a Counter).
    # Any of those being present means the metric was already registered.
    for registered_name, collector in list(REGISTRY._names_to_collectors.items()):
        if hasattr(collector, "_name") and collector._name == name:
            return collector
    # Not found — safe to create (which auto-registers).
    if labelnames:
        return metric_cls(name, documentation, labelnames)
    return metric_cls(name, documentation)


events_ingested_total = _get_or_create(
    Counter,
    "soroscan_events_ingested_total",
    "Total number of contract events ingested",
    ["contract_id", "network", "event_type"],
)

task_duration_seconds = _get_or_create(
    Histogram,
    "soroscan_task_duration_seconds",
    "Duration of Celery tasks in seconds",
    ["task_name"],
)

active_contracts_gauge = _get_or_create(
    Gauge,
    "soroscan_tracked_contracts_active",
    "Number of currently active tracked contracts",
)