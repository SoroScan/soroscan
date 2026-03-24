# GraphQL Schema Changelog

This document tracks all schema changes, deprecations, and their sunset dates.

## Versioning Strategy

| Endpoint | Schema | Description |
|---|---|---|
| `/graphql/` | v1 | Default — backwards-compatible, deprecated fields present |
| `/graphql/v1/` | v1 | Explicit v1 endpoint |
| `/graphql/v2/` | v2 | Clean schema — deprecated fields removed |

Both v1 and v2 are supported simultaneously for a minimum of 6 months after a
deprecation is introduced. After the sunset date, the field is removed from v1
and a new minor version may be cut.

Response headers:
- `X-GraphQL-Schema-Version` — which schema version handled the request (`v1` or `v2`)
- `X-GraphQL-Deprecations` — comma-separated list of deprecated fields used in the request

---

## Active Deprecations

### `ContractType.eventCount`
- **Deprecated in:** v1 (2026-03-24)
- **Sunset date:** 2026-12-31
- **Reason:** Expensive N+1 query on every contract list response.
- **Migration:** Use `contractStats(contractId: "...") { totalEvents }` instead.
- **Removed in:** v2

### `Query.recentErrors`
- **Deprecated in:** v1 (2026-03-24)
- **Sunset date:** 2026-12-31
- **Reason:** Replaced by richer `systemMetrics` resolver which aggregates error data.
- **Migration:** Use `systemMetrics { ... }` instead.
- **Removed in:** v2

---

## Changelog

### 2026-03-24 — Issue #105

- Added `/graphql/v1/` and `/graphql/v2/` versioned endpoints.
- Added `X-GraphQL-Schema-Version` and `X-GraphQL-Deprecations` response headers.
- Deprecated `ContractType.eventCount` (sunset 2026-12-31).
- Deprecated `Query.recentErrors` (sunset 2026-12-31).
- Added `GraphQLDeprecationMiddleware` for Sentry-based deprecation analytics.
- Added CI schema check workflow (`.github/workflows/schema-check.yml`).
