# ADR 0009: Redis as Shared Cache, Broker, and Channel Layer

## Status
Accepted

## Context
SoroScan needs a low-latency shared store for ephemeral data and cross-process coordination:
rate limiting counters, query caches, Celery task broker and result backend, and Django Channels
pub/sub for WebSocket subscriptions.

## Decision
Use Redis for caching, rate limiting, Celery broker/result backend, and Channels pub/sub.

A single Redis instance serves all four roles. This keeps operational dependencies minimal while
providing the low-latency characteristics each consumer requires.

## Rationale
- Single shared dependency for Celery and Channels reduces operational overhead.
- Redis supports atomic counters (rate limiting), TTL-based caches, and pub/sub natively.
- Significant performance gains for repeated query patterns versus hitting PostgreSQL every time.

## Alternatives Considered
- **Separate stores per role**: E.g., Memcached for cache, RabbitMQ for Celery broker. Increases
  operational complexity without meaningful benefit at SoroScan's current scale.

## Consequences
**Positive:**
- Centralised rate limit counters and query caches.
- Single Redis dependency for Celery and Channels.
- Low-latency ephemeral storage improves API response times.

**Negative:**
- Redis becomes a critical operational dependency; requires proper sizing, persistence config,
  and eviction policy tuning.
- Memory must be budgeted to serve all four roles simultaneously.

## Implementation Notes
- `django-backend/soroscan/settings.py` — cache backend, Channels layer, Celery broker/result
- `django-backend/soroscan/ingest/cache_utils.py`
- `k8s/configmap.yaml` — `REDIS_URL` env var

## Related Decisions
- ADR 0001: Event Ingestion Architecture
- ADR 0004: Webhook Delivery System
