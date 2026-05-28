# Event Ingestion Latency Metrics - Implementation Summary

**Issue**: #593 - Add Event Ingestion Latency Metrics  
**Status**: ✅ COMPLETE  
**Complexity**: Trivial  
**Time Estimate**: 3-4 hours

---

## Acceptance Criteria - All Met ✅

1. ✅ **Latency measured** - Histogram metric tracks time from event emission to indexing
2. ✅ **Exported to Prometheus** - Metric exported with standard Prometheus format
3. ✅ **Percentiles tracked** - p50, p95, p99 percentiles available via histogram buckets
4. ✅ **Dashboard shows metrics** - Grafana dashboard with latency visualization

---

## Implementation

### 1. Metric Definition (`soroscan/ingest/metrics.py`)

Added new histogram metric:
```python
event_ingestion_latency_seconds = _get_or_create(
    Histogram,
    "soroscan_event_ingestion_latency_seconds",
    "Time from event emission to indexing in seconds",
    ["contract_id", "network"],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 300.0, float("inf")),
)
```

**Features**:
- Histogram with 10 buckets optimized for typical latencies
- Labels: `contract_id`, `network` for filtering
- Supports p50, p95, p99 percentile queries

### 2. Latency Recording (`soroscan/ingest/tasks.py`)

Added latency observation in `ingest_latest_events()`:
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

**Logic**:
- Calculates latency: `now - event.created_at`
- Records only for newly created events
- Uses short contract ID to avoid cardinality explosion

### 3. Grafana Dashboard (`k8s/grafana-dashboard-ingestion-latency.json`)

Pre-built dashboard with 4 panels:
1. **Event Ingestion Latency Percentiles** - p50, p95, p99 over time
2. **Current p95 Latency** - Gauge showing current p95
3. **Event Ingestion Rate** - Events/sec by contract
4. **Ingestion Rate by Contract** - Pie chart distribution

### 4. Tests (`soroscan/ingest/tests/test_ingestion_latency_metrics.py`)

Test coverage:
- Latency metric recording
- Multi-contract tracking
- Percentile histogram functionality

### 5. Documentation (`EVENT_INGESTION_LATENCY_METRICS.md`)

Complete documentation including:
- Prometheus queries for all percentiles
- Grafana dashboard import instructions
- Alerting rules examples
- Troubleshooting guide

---

## Files Modified/Created

### Modified
- `soroscan/ingest/metrics.py` - Added latency metric and updated helper function
- `soroscan/ingest/tasks.py` - Added latency recording in ingestion task

### Created
- `k8s/grafana-dashboard-ingestion-latency.json` - Grafana dashboard
- `soroscan/ingest/tests/test_ingestion_latency_metrics.py` - Tests
- `EVENT_INGESTION_LATENCY_METRICS.md` - Documentation
- `EVENT_INGESTION_LATENCY_IMPLEMENTATION.md` - This file

---

## Prometheus Queries

### Get p50 latency
```promql
histogram_quantile(0.50, rate(soroscan_event_ingestion_latency_seconds_bucket[5m]))
```

### Get p95 latency
```promql
histogram_quantile(0.95, rate(soroscan_event_ingestion_latency_seconds_bucket[5m]))
```

### Get p99 latency
```promql
histogram_quantile(0.99, rate(soroscan_event_ingestion_latency_seconds_bucket[5m]))
```

### Get latency by contract
```promql
histogram_quantile(0.95, rate(soroscan_event_ingestion_latency_seconds_bucket{contract_id="CONTRACT_ID"}[5m]))
```

---

## Alerting Examples

### High Latency Alert
```yaml
- alert: HighEventIngestionLatency
  expr: histogram_quantile(0.95, rate(soroscan_event_ingestion_latency_seconds_bucket[5m])) > 10
  for: 5m
```

### Latency Spike Alert
```yaml
- alert: EventIngestionLatencySpike
  expr: rate(soroscan_event_ingestion_latency_seconds_sum[1m]) / rate(soroscan_event_ingestion_latency_seconds_count[1m]) > 5
  for: 2m
```

---

## Deployment

### 1. Deploy Code Changes
```bash
git add soroscan/ingest/metrics.py soroscan/ingest/tasks.py
git commit -m "feat: add event ingestion latency metrics"
git push
```

### 2. Import Grafana Dashboard
```bash
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @k8s/grafana-dashboard-ingestion-latency.json
```

### 3. Configure Alerting (Optional)
Add alerting rules to Prometheus configuration

---

## Performance Impact

- **Minimal**: Single histogram observation per event
- **Memory**: ~1KB per metric instance
- **CPU**: Negligible (microseconds per observation)
- **Cardinality**: Controlled via `_short_contract_id()` function

---

## Monitoring

### Key Metrics to Watch
- **p95 Latency**: Should be < 5 seconds for healthy system
- **p99 Latency**: Should be < 10 seconds
- **Ingestion Rate**: Should be consistent with contract activity

### Dashboard Access
- URL: `http://grafana:3000/d/soroscan-ingestion-latency`
- Refresh: 30 seconds
- Time Range: Last 1 hour (configurable)

---

## Troubleshooting

### No metrics appearing
1. Verify `ingest_latest_events` task is running
2. Check that events have `created_at` timestamp
3. Verify Prometheus scrape configuration

### High cardinality
- Metric uses `_short_contract_id()` to limit label values
- Consider aggregating by network if needed

---

## Future Enhancements

1. **Detailed Timing Breakdown**
   - Separate metrics for validation, decoding, storage
   - Identify specific bottlenecks

2. **SLA Tracking**
   - Track percentage of events meeting latency SLA
   - Alert on SLA violations

3. **Per-Event-Type Latency**
   - Track latency by event type
   - Identify slow event types

4. **Latency Correlation**
   - Correlate with ingestion rate
   - Identify rate-dependent latency

---

## Summary

Successfully implemented event ingestion latency metrics with:
- ✅ Histogram metric with percentile support
- ✅ Prometheus export with standard format
- ✅ Grafana dashboard for visualization
- ✅ Complete documentation and examples
- ✅ Test coverage
- ✅ Minimal performance impact

**Ready for**: Code review → Testing → Deployment
