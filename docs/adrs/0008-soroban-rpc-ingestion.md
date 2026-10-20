# ADR 0008: Use Soroban RPC for Event Ingestion

## Status
Accepted

## Context
SoroScan indexes Soroban contract events from Stellar. Horizon provides general ledger access, but
does not expose Soroban-specific contract event semantics. Soroban RPC provides contract-level
event filters, richer metadata, and direct pagination over ledger ranges.

## Decision
Use the Soroban RPC interface through `stellar_sdk.SorobanServer` instead of relying on Horizon
event streaming. Celery workers poll the RPC, chunk missing ledger ranges, and persist events to
PostgreSQL (see ADR 0001 for the full ingestion architecture).

## Rationale
- Soroban RPC exposes richer contract event metadata (`type`, `value`, `xdr`, `ledger`).
- Direct support for contract-level filters and event pagination.
- Stronger compatibility with Soroban contract semantics than Horizon alone.

## Alternatives Considered
- **Horizon-only**: Simpler operational dependency but lacks Soroban-specific event data and filtering.

## Consequences
**Positive:**
- Full contract event metadata available at ingestion time.
- Precise control over request rate and backoff strategy.
- Native ledger-range pagination for efficient backfill.

**Negative:**
- Requires access to a Soroban-enabled RPC node.
- Slightly higher operational complexity than HTTP-only Horizon polling.

## Implementation Notes
- `django-backend/soroscan/ingest/tasks.py` — uses `SorobanServer.get_events()`
- `django-backend/soroscan/ingest/stellar_client.py`

## Related Decisions
- ADR 0001: Event Ingestion Architecture
