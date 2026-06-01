# SoroScan Architecture Decision Records (ADRs)

This document records the rationale behind key architecture decisions for SoroScan.

## ADR 001: Soroban RPC vs Horizon-only ingestion

### Decision
Use the Soroban RPC interface through `stellar_sdk.SorobanServer` instead of relying solely on Horizon event streaming.

### Context
SoroScan indexes Soroban contract events from Stellar. Horizon provides general ledger access, but Soroban RPC exposes contract-specific event semantics and better transaction simulation capabilities.

### Consequences
- Pros:
  - richer contract event metadata (`type`, `value`, `xdr`, `ledger`)
  - direct support for contract-level filters and event pagination
  - stronger compatibility with Soroban contract semantics
- Cons:
  - dependency on Soroban-enabled RPC nodes
  - slightly higher operational complexity than HTTP-only Horizon polling

### Implementation
- `django-backend/soroscan/ingest/tasks.py` uses `SorobanServer.get_events()`.
- `django-backend/soroscan/ingest/stellar_client.py` uses the Soroban client for contract writes and transaction lookup.

## ADR 002: PostgreSQL for event storage

### Decision
Use PostgreSQL as the primary database for SoroScan.

### Context
Event indexing requires durable persistence, query flexibility, and support for relational integrity.

### Consequences
- Pros:
  - strong ACID guarantees for event writes
  - JSON/JSONB payload support for flexible event storage
  - powerful indexing for event queries and time-range filters
  - excellent Django ORM and migration support
- Cons:
  - not as schemaless as some NoSQL stores, but JSON fields mitigate this.

### Implementation
- `django-backend/soroscan/settings.py` configures `DATABASE_URL`.
- schema models are defined in `django-backend/soroscan/ingest/models.py`.

## ADR 003: Strawberry GraphQL for flexible query surface

### Decision
Use Strawberry GraphQL for schema-driven GraphQL support.

### Context
GraphQL is important for developer-friendly event exploration and nested contract queries.

### Consequences
- Pros:
  - type-safe schema definition with Python dataclasses
  - direct integration with Django models
  - easier to extend with query resolvers and custom fields
- Cons:
  - implementation complexity compared to pure REST
  - requires careful rate limiting and introspection control

### Implementation
- `django-backend/soroscan/ingest/schema.py` defines the GraphQL API.
- `django-backend/soroscan/graphql_views.py` wraps GraphQL view behavior.
- `django-backend/soroscan/asgi.py` wires WebSocket subscriptions.

## ADR 004: Exponential backoff for webhook retries

### Decision
Use exponential backoff as the default retry strategy for failing webhook deliveries.

### Context
Webhook subscribers can fail transiently, return HTTP 429, or temporarily be unavailable. Immediate retry loops can overwhelm subscribers and the delivery system.

### Consequences
- Pros:
  - reduces replay storm risk
  - gives target systems time to recover
  - aligns with standard webhook delivery best practices
- Cons:
  - longer time to recovery for some intermittent failures compared to constant retry

### Implementation
- default strategy: `WebhookSubscription.BACKOFF_EXPONENTIAL`
- configurable base delay via `retry_backoff_seconds`
- `dispatch_webhook` uses Celery retry backoff and jitter
- `calculate_backoff()` in `django-backend/soroscan/ingest/tasks.py` computes delays

## ADR 005: Redis as shared cache and channel layer

### Decision
Use Redis for caching, rate limiting, Celery broker/result backend, and Channels pub/sub.

### Context
SoroScan needs a low-latency shared store for ephemeral data and cross-process coordination.

### Consequences
- Pros:
  - centralized rate limit counters and query caches
  - single dependency for Celery and Channels
  - significant performance gains for repeated query patterns
- Cons:
  - Redis now becomes a critical operational dependency
  - requires careful sizing for persistence and eviction policies

### Implementation
- Django cache backend in `django-backend/soroscan/settings.py`
- Channels layer uses Redis in the same settings file
- Celery broker/result backend also points at Redis
- cache utilities in `django-backend/soroscan/ingest/cache_utils.py`

## ADR 006: Django + Next.js as the application stack

### Decision
Build the backend in Django and the user-facing UI in Next.js.

### Context
The backend needs a solid API and data model layer. The frontend needs a modern developer dashboard.

### Consequences
- Pros:
  - Django gives rapid backend development with strong database support
  - Next.js gives a responsive and extensible React UI
  - separation enables independent backend and frontend deployment
- Cons:
  - two codebases with separate build and deployment concerns

### Implementation
- backend in `django-backend/`
- dashboard and admin UI in `soroscan-frontend/` and `admin/`

---

These ADRs are meant to capture the current reasoning for the architectural decisions in SoroScan. For future changes, add a new numbered ADR and update this document.
