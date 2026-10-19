# Playbook: Celery Queue Backlog

**Alert:** `SoroScanCeleryQueueDepthHigh` / remediation condition `celery_queue_backlog`  
**Severity:** warning (escalates to critical if depth continues rising for >30m or worker failures spike)  
**SLO impact:** Ingestion freshness lag, webhook delivery latency, and delayed event notifications

## Detection

- Prometheus alert `SoroScanCeleryQueueDepthHigh`: `soroscan_celery_queue_depth > 100` for 10 minutes.
- Grafana Celery dashboard reports an elevated count of pending tasks across one or more queues (`high_priority`, `default`, `low_priority`, `backfill`).
- Task completion rate (`rate(soroscan_celery_tasks_total[5m])`) is stagnant or dropping while queue depth grows.
- Downstream symptoms: Rising `SoroScanEventIngestionLag` or subscriber notifications delayed past delivery SLAs.

## Triage (Identifying the Bottleneck)

### 1. Identify which queue is accumulating backlog
Celery routes tasks into dedicated priority queues:
- **`high_priority`**: Real-time contract event processing and immediate dispatch.
- **`default`**: Standard ingestion pipelines, webhook deliveries, and routine task dispatch.
- **`low_priority`**: Periodic reconciliation, metrics aggregation, and data pruning jobs.
- **`backfill`**: Heavy historical ledger backfills and bulk event indexing.

Determine the affected queue via Redis queue lengths or Prometheus label `queue`.

### 2. Inspect worker pod health and concurrency
- Check whether worker pods (`soroscan-worker-high`, `soroscan-worker-default`, `soroscan-worker-low`, `soroscan-worker-backfill`) are crashing, hitting memory limits (OOMKilled), or throttling on CPU.
- Verify active tasks vs concurrency limits per worker replica.

### 3. Check for producer overload or external dependency stalls
- A bulk backfill job or mass contract re-index was triggered without throttling.
- Slow PostgreSQL database queries (lock contention) or Soroban RPC rate limits causing worker tasks to hang or retry repeatedly.

## Alert → action mapping

| Step | Owner | Action |
|------|-------|--------|
| 1 | Automation | `send_alert` to on-call channel with queue name and current depth |
| 2 | On-call | Identify backed-up queue and inspect worker logs / active task counts |
| 3 | On-call | Scale worker Deployment replicas or verify HPA scaling response |
| 4 | On-call | Pause or rate-limit producers (e.g. pause backfill CronJobs or contract indexing) |
| 5 | On-call | Investigate worker task exceptions / purge poison tasks if unrecoverable |
| 6 | On-call | Monitor queue draining until backlog drops below baseline (<20) |

## Investigation commands

```bash
# 1. Check pending queue depths in Redis broker
redis-cli -u "$CELERY_BROKER_URL" LLEN high_priority
redis-cli -u "$CELERY_BROKER_URL" LLEN default
redis-cli -u "$CELERY_BROKER_URL" LLEN low_priority
redis-cli -u "$CELERY_BROKER_URL" LLEN backfill

# 2. Inspect active, reserved, and registered Celery tasks
celery -A soroscan inspect active
celery -A soroscan inspect reserved
celery -A soroscan inspect stats

# 3. Check worker pod status and resource utilization in Kubernetes
kubectl get pods -l app=soroscan -n soroscan
kubectl top pods -l app=soroscan -n soroscan

# 4. View worker logs for recurring exceptions or timeout errors
kubectl logs -l app=soroscan,component=worker-default -n soroscan --tail=200
kubectl logs -l app=soroscan,component=worker-high -n soroscan --tail=200
```

## Remediation

### Immediate Scaling
If workers are CPU/memory constrained but DB/RPC capacity allows:
```bash
# Temporarily scale worker replicas to increase throughput
kubectl scale deployment/soroscan-worker-default --replicas=4 -n soroscan
kubectl scale deployment/soroscan-worker-high --replicas=3 -n soroscan
```

### Throttling Producers
If the backlog is caused by an unconstrained backfill or batch job:
```bash
# Pause backfill CronJob or scale down backfill worker
kubectl patch cronjob/soroscan-backfill -n soroscan -p '{"spec":{"suspend":true}}'

# Pause specific high-traffic contracts via API if needed
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api/api/ingest/contracts/{contract_id}/pause/
```

### Poison Task Handling
If workers are stuck in a crash loop caused by a corrupt task payload:
- Inspect the task arguments using `celery -A soroscan inspect active`.
- Quarantine or discard the poison task to unblock the remaining backlog.

## Automation

RemediationRule condition:

```json
{
  "type": "celery_queue_backlog",
  "queue": "default",
  "depth_threshold": 100,
  "duration_minutes": 10
}
```

Actions: `[{"type": "send_alert"}]`

## Resolution checklist

- [ ] Queue depths across all queues have returned to healthy baseline (<20 pending tasks).
- [ ] Celery worker pods are healthy with zero CrashLoopBackOff or OOMKilled events.
- [ ] Root cause identified (producer surge, slow DB query, RPC timeout, poison task).
- [ ] Any suspended backfill jobs or paused contracts resumed.
- [ ] Temporary worker scale overrides reconciled with standard HPA configurations.
- [ ] Post-incident summary and action items recorded.
