# Architecture Decision Records (ADRs)

**This is the single canonical location for SoroScan Architecture Decision Records.**

> Previously, ADRs were split across `docs/adrs/` (numbered 0001–0005) and
> `docs/architecture/` (`adr_001_django_backend.md`, `adr_002_strawberry_graphql.md`,
> `adr_index.md`, `adr.md`, `adr_template.md`).  Both sets are now consolidated here.
> The files in `docs/architecture/` that duplicated or listed ADRs have been retired
> with redirects; this directory is authoritative going forward.

ADRs capture the context, rationale, and consequences of significant technical choices so future
contributors understand *why* the system is built the way it is.

## Index

| # | Title | Status |
|---|-------|--------|
| [0001](0001-event-ingestion-architecture.md) | Event Ingestion Architecture | Accepted |
| [0002](0002-graphql-vs-rest.md) | GraphQL vs REST API Tradeoffs | Accepted |
| [0003](0003-database-schema-rationale.md) | Database Schema Rationale | Accepted |
| [0004](0004-webhook-delivery-system.md) | Webhook Delivery System | Accepted |
| [0005](0005-multi-tenancy-design.md) | Multi-Tenancy Design | Accepted |
| [0006](0006-django-backend.md) | Use Django for the Backend | Accepted |
| [0007](0007-strawberry-graphql.md) | Use Strawberry GraphQL | Accepted |
| [0008](0008-soroban-rpc-ingestion.md) | Soroban RPC for Event Ingestion | Accepted |
| [0009](0009-redis-cache-and-broker.md) | Redis as Cache, Broker, and Channel Layer | Accepted |

## ADR Statuses

- **Proposed** — under discussion, not yet accepted.
- **Accepted** — approved and guides implementation.
- **Deprecated** — no longer recommended but kept for historical context.
- **Superseded** — a newer ADR replaces this decision; link to the replacement from the old record.

## Creating a New ADR

1. Copy [`../architecture/adr_template.md`](../architecture/adr_template.md) into this directory.
2. Assign the next available four-digit number (e.g. `0010`).
3. Name the file descriptively: `0010-short-decision-title.md`.
4. Fill in Context, Decision, Rationale, Alternatives, and Consequences sections.
5. Set the initial status to `Proposed`.
6. Add the new entry to the table above.
7. Submit via a pull request; the ADR is `Accepted` once the PR is merged.

Do not rewrite an accepted ADR to describe a different decision — create a new ADR and mark the
previous one `Superseded` with a link to its replacement.
