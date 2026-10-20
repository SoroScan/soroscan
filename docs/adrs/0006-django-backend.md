# ADR 0006: Use Django for the SoroScan Backend

## Status
Accepted

## Context
SoroScan requires a backend capable of ingesting Soroban events, exposing REST and GraphQL APIs,
managing relational data (contracts, webhooks, orgs, API keys), running migrations, and integrating
asynchronous background processing with Celery. The framework must support PostgreSQL and Redis.

## Decision
Use Django as the primary backend application framework.

REST is handled through Django REST Framework. GraphQL is integrated through Strawberry (see ADR 0007).
Asynchronous work is handled by Celery while sharing the same Django application config and models.

## Rationale
- Django's ORM and migration tooling cover the full relational data model.
- PostgreSQL support is mature; JSONB fields handle flexible event payloads (see ADR 0003).
- DRF and Strawberry both integrate with the same Django models.
- Established conventions (settings, routing, middleware, auth, admin) reduce custom infra code.

## Alternatives Considered
- **FastAPI**: Lightweight and async-native, but SoroScan also depends on migrations, admin, and auth
  tooling that Django provides as an integrated platform.
- **Flask**: Flexible but requires assembling authentication, migration, and admin functionality separately.
- **Node.js**: Shares a language with the Next.js frontend but would require a full Python-to-JS migration
  of the existing backend, models, and test suite.

## Consequences
**Positive:**
- Mature ORM for relational data model; schema changes managed through migrations.
- REST and GraphQL APIs share the same application models.
- Integrates with PostgreSQL, Redis, Celery, and the existing authentication system.

**Negative:**
- Django is a larger framework than needed for lightweight HTTP-only endpoints.
- Real-time/async workflows require additional components (Celery, Channels, Redis).

## Implementation Notes
- `django-backend/manage.py`, `soroscan/settings.py`, `soroscan/urls.py`
- `django-backend/soroscan/ingest/models.py`, `soroscan/ingest/migrations/`
- `django-backend/soroscan/celery.py`

## Related Decisions
- ADR 0007: Use Strawberry GraphQL for the GraphQL API
- ADR 0003: Database Schema Rationale
