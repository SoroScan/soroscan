# Event Ingestion Latency Metrics

## Overview

Tracks the time from event emission to indexing in SoroScan. This metric helps identify bottlenecks in the event processing pipeline and monitor system performance.

## Metrics

### `soroscan_event_ingestion_latency_seconds`

**Type**: Histogram  
**Labels**: `contract_id`, `network`  
**Buckets**: 0.1s, 0.5s, 1s, 2s, 5s, 10s, 30s, 60s, 300s  
**Unit**: Seconds

Measures the latency from when an event is emitted on-chain to when it's indexed in SoroScan.

**Percentiles Available**:
- `p50` (median): 50th percentile latency
- `p95`: 95th percentile latency
- `p99`: 99th percentile latency

## Prometheus Queries

### Get current p50 latency
```promql
histogram_quantile(0.50, rate(soroscan_event_ingestion_latency_seconds_bucket[5m]))
```

### Get current p95 latency
```promql
histogram_quantile(0.95, rate(soroscan_event_ingestion_latency_seconds_bucket[5m]))
```

### Get current p99 latency
```promql
histogram_quantile(0.99, rate(soroscan_event_ingestion_latency_seconds_bucket[5m]))
```

### Get latency by contract
```promql
histogram_quantile(0.95, rate(soroscan_event_ingestion_latency_seconds_bucket{contract_id="CONTRACT_ID"}[5m]))
```

### Get average latency
```promql
rate(soroscan_event_ingestion_latency_seconds_sum[5m]) / rate(soroscan_event_ingestion_latency_seconds_count[5m])
```

## Grafana Dashboard

A pre-built dashboard is available at `k8s/grafana-dashboard-ingestion-latency.json`.

**Dashboard Panels**:
1. **Event Ingestion Latency Percentiles** - Shows p50, p95, p99 over time
2. **Current p95 Latency** - Gauge showing current p95 latency
3. **Event Ingestion Rate** - Events per second by contract
4. **Ingestion Rate by Contract** - Pie chart of ingestion rate distribution

### Import Dashboard

```bash
# Using Grafana API
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @k8s/grafana-dashboard-ingestion-latency.json
```

## Alerting Rules

### Alert: High Ingestion Latency

```yaml
- alert: HighEventIngestionLatency
  expr: histogram_quantile(0.95, rate(soroscan_event_ingestion_latency_seconds_bucket[5m])) > 10
  for: 5m
  annotations:
    summary: "Event ingestion latency is high (p95 > 10s)"
```

### Alert: Latency Spike

```yaml
- alert: EventIngestionLatencySpike
  expr: rate(soroscan_event_ingestion_latency_seconds_sum[1m]) / rate(soroscan_event_ingestion_latency_seconds_count[1m]) > 5
  for: 2m
  annotations:
    summary: "Event ingestion latency spike detected (avg > 5s)"
```

## Implementation Details

### Recording Latency

Latency is recorded in `ingest_latest_events()` task when a new event is created:

```python
if created:
    # Record ingestion latency
    if hasattr(event, "created_at") and event.created_at:
        latency = (timezone.now() - event.created_at).total_seconds()
        m.event_ingestion_latency_seconds.labels(
            contract_id=_short_contract_id(contract.contract_id),
            network=network,
        ).observe(latency)
```

### Latency Calculation

- **Event Emission Time**: `event.created_at` (from Soroban RPC)
- **Indexing Time**: `timezone.now()` (when event is saved to database)
- **Latency**: `indexing_time - emission_time`

## Performance Considerations

- Histogram buckets are optimized for typical latencies (0.1s to 300s)
- Metric is only recorded for newly created events (not updates)
- Minimal performance impact: single observation per event
- Labels are limited to contract_id and network to avoid cardinality explosion

## Troubleshooting

### No latency data appearing

1. Check that events have `created_at` timestamp from Soroban RPC
2. Verify Prometheus is scraping the metrics endpoint
3. Check that `ingest_latest_events` task is running

### High cardinality issues

If too many unique contract_ids are being tracked:
- Use `_short_contract_id()` function to limit label values
- Consider aggregating by network only if needed

## Related Metrics

- `soroscan_events_ingested_total` - Total events ingested
- `soroscan_task_duration_seconds` - Overall task duration
- `soroscan_event_ingestion_rate` - Current ingestion rate
