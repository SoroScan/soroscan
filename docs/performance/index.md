# Performance Tuning & Optimization Guide

This guide explains how to identify and fix performance bottlenecks across the full SoroScan stack.

## Performance Profiling Tools

- Django Debug Toolbar for request-level timing and SQL inspection.
- Django Silk for request profiling and middleware tracing.
- PostgreSQL `EXPLAIN ANALYZE` for query cost and plan analysis.
- Redis monitoring with `redis-cli monitor`, `INFO`, and external dashboards.
- Chrome DevTools, Lighthouse, and WebPageTest for frontend performance.

## Database Optimization

- Use indexes on frequently filtered and joined columns.
- Prevent N+1 queries with `select_related` and `prefetch_related`.
- Tune connection pooling and database timeouts in `DATABASE_URL`/`pgbouncer`.
- Analyze slow queries using PostgreSQL logs and `EXPLAIN`.

Example PostgreSQL query review:

```sql
EXPLAIN ANALYZE
SELECT * FROM ingest_event WHERE contract_id = '...';
```

## Caching Strategy

- Use Redis for frequently requested query results and API caches.
- Design cache keys with versioning and time-based invalidation.
- Cache database query results, computed dashboards, and endpoint responses.
- Leverage HTTP caching headers for browser and CDN-level caching.

## API Performance

- Measure response times for REST and GraphQL endpoints.
- Optimize pagination by limiting payload size and using cursor-based cursors.
- Avoid expensive filtering operations on unindexed columns.
- Use rate limiting to protect service availability while preserving performance.

## Frontend Performance

- Apply code splitting and lazy loading for heavy pages.
- Optimize images, fonts, and build output bundle sizes.
- Reduce client-side work on initial load and defer non-critical scripts.
- Audit hydration and runtime performance with Lighthouse.

## Monitoring Performance

- Establish baselines for response time, throughput, and error rates.
- Track performance trends in dashboards and alerts.
- Use Grafana or equivalent tools for ongoing visibility.
- Document before/after optimization results with metrics.

## Practical Guidance

- Start by profiling the slowest request path, then optimize incrementally.
- Compare baseline metrics before and after changes.
- Keep performance regressions visible in CI with targeted smoke tests.
