# ADR 0007: Use Strawberry GraphQL for the SoroScan GraphQL API

## Status
Accepted

## Context
Some API consumers need to select specific fields, query nested contract/event data, use real-time
subscriptions, and generate TypeScript types from the schema. The frontend uses Apollo Client and
GraphQL Code Generator. SoroScan therefore needs a GraphQL implementation that integrates well with
Django and the existing Python typed codebase.

## Decision
Use Strawberry GraphQL as the GraphQL framework for the Django backend.

The schema is defined in `django-backend/soroscan/ingest/schema.py` using Python type annotations.
Strawberry Django reduces duplication between database models and GraphQL types. The Next.js frontend
consumes the API via Apollo Client and generates TypeScript types through GraphQL Code Generator.

## Rationale
- Strawberry uses Python type annotations — consistent with SoroScan's typed Python codebase.
- `strawberry-graphql-django` integrates directly with Django models.
- Clients request only the fields needed for each view, avoiding over-fetching.
- Queries, mutations, and subscriptions are supported through a single schema.
- Apollo Client and TypeScript code generation are already wired in the frontend.

## Alternatives Considered
- **Graphene-Django**: Established but uses a less modern API style than Strawberry's type-annotation approach.
- **REST-only**: Would remove the code-generation workflow the frontend relies on and reduce query flexibility.

## Consequences
**Positive:**
- Type-safe schema definitions using Python dataclasses/annotations.
- Clients request only the fields they need.
- Frontend TypeScript types are generated from the schema.
- Subscriptions provide real-time event delivery over WebSockets.

**Negative:**
- Contributors must understand GraphQL in addition to the REST API.
- Schema changes affect generated frontend types.
- Complex queries require depth/complexity limits to prevent DoS.

## Implementation Notes
- `django-backend/soroscan/ingest/schema.py`
- `django-backend/soroscan/graphql_views.py`
- `django-backend/soroscan/graphql_complexity.py`
- `soroscan-frontend/lib/apollo-client.ts`
- `soroscan-frontend/codegen.ts`

## Related Decisions
- ADR 0006: Use Django for the SoroScan Backend
- ADR 0002: GraphQL vs REST API Tradeoffs
