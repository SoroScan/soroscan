# Multi-Region Replication Monitoring

This document describes the multi-region database replication lag monitoring feature for SoroScan.

## Overview

The replication monitoring system continuously measures the lag between primary and replica databases, exports metrics to Prometheus, displays them in Grafana dashboards, and generates alerts when lag exceeds configured thresholds.

## Acceptance Criteria

✅ **Replication lag measured** - Implemented in `soroscan/ingest/replication.py`
✅ **Metrics exported** - Prometheus metrics defined in `soroscan/ingest/metrics.py`
✅ **Dashboard shows lag over time** - Grafana panels added to `k8s/grafana-dashboard.json`
✅ **Alerts on lag > threshold** - Alert rules defined in `k8s/alert-rules-replication.yaml`

## Architecture

### Components

1. **ReplicationLagMonitor** (`soroscan/ingest/replication.py`)
   - Measures replication lag using LSN comparison or write-test method
   - Queries PostgreSQL replication status
   - Checks lag against configured thresholds
   - Generates alert information

2. **Prometheus Metrics** (`soroscan/ingest/metrics.py`)
   - `soroscan_replication_lag_seconds` - Current lag in seconds (Gauge)
   - `soroscan_replication_lag_checks_total` - Total checks performed (Counter)
   - `soroscan_replication_status` - Health status 1=healthy, 0=unhealthy (Gauge)
   - `soroscan_replication_alerts_total` - Total alerts triggered (Counter)

3. **Celery Tasks** (`soroscan/ingest/tasks.py`)
   - `monitor_replication_lag()` - Periodic lag measurement and alerting
   - `check_replica_health()` - Comprehensive replica status check

4. **Management Command** (`soroscan/ingest/management/commands/check_replication_lag.py`)
   - CLI tool for manual lag checking
   - Supports continuous monitoring daemon mode
   - Configurable check intervals and measurement methods

5. **Dashboard** (`k8s/grafana-dashboard.json`)
   - Lag over time (time series graph)
   - Current lag gauge with color thresholds
   - Health status visualization
   - Alert activity monitoring

6. **Alert Rules** (`k8s/alert-rules-replication.yaml`)
   - Warning on lag > 5 seconds
   - Critical alert on lag > 10 seconds
   - Health status monitoring
   - Check failure detection

## Configuration

### Django Settings

Add these environment variables or settings:

```python
# Database Configuration
DATABASE_URL = "postgresql://user:pass@primary-db:5432/soroscan"

# Replica database (optional - required if using separate replica connection)
REPLICA_DB_ALIAS = "replica"

# Replication thresholds (in seconds)
REPLICATION_LAG_THRESHOLD_SECONDS = 5.0  # Warning threshold
REPLICATION_LAG_ALERT_THRESHOLD_SECONDS = 10.0  # Critical threshold

# Region identifier for multi-region deployments
REGION_NAME = "us-east-1"  # or any region identifier

# Django databases configuration
DATABASES = {
    "default": {  # Primary database
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "soroscan",
        "USER": "soroscan_user",
        "PASSWORD": "...",
        "HOST": "primary-db.internal",
        "PORT": "5432",
    },
    "replica": {  # Read replica (optional)
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "soroscan",
        "USER": "soroscan_user",
        "PASSWORD": "...",
        "HOST": "replica-db.internal",
        "PORT": "5432",
    },
}
```

### Celery Beat Schedule

Add to your Celery beat configuration:

```python
from celery.schedules import schedule

CELERY_BEAT_SCHEDULE = {
    # Monitor replication lag every 30 seconds
    "monitor-replication-lag": {
        "task": "soroscan.ingest.tasks.monitor_replication_lag",
        "schedule": schedule(run_every=30),  # or crontab(minute="*/1")
    },
    # Check replica health every 5 minutes
    "check-replica-health": {
        "task": "soroscan.ingest.tasks.check_replica_health",
        "schedule": crontab(minute="*/5"),
    },
}
```

### Prometheus Configuration

Add to `prometheus.yml`:

```yaml
# Scrape SoroScan metrics
scrape_configs:
  - job_name: "soroscan"
    static_configs:
      - targets: ["soroscan-backend:8000"]
    metrics_path: "/metrics"

# Load alert rules
rule_files:
  - "/etc/prometheus/alert-rules-replication.yaml"
```

### Kubernetes Deployment

Update your `backend-deployment.yaml`:

```yaml
spec:
  template:
    spec:
      containers:
        - name: soroscan-backend
          env:
            - name: REPLICA_DB_ALIAS
              value: "replica"
            - name: REPLICATION_LAG_THRESHOLD_SECONDS
              value: "5"
            - name: REPLICATION_LAG_ALERT_THRESHOLD_SECONDS
              value: "10"
            - name: REGION_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName # or other region identifier
```

## Usage

### Manual Monitoring

Run a single replication lag check:

```bash
python manage.py check_replication_lag
```

Run continuous monitoring (daemon mode):

```bash
python manage.py check_replication_lag --continuous --interval 30
```

Use write-test method for more accurate measurement:

```bash
python manage.py check_replication_lag --method write-test
```

### Viewing Metrics

Access Prometheus metrics at:

```
http://soroscan-backend:8000/metrics
```

Example queries:

```promql
# Current lag
soroscan_replication_lag_seconds

# Average lag over 5 minutes
avg(soroscan_replication_lag_seconds[5m])

# Lag increasing over time (derivative)
deriv(soroscan_replication_lag_seconds[5m])

# Check success rate
rate(soroscan_replication_lag_checks_total{status="success"}[5m])
```

### Grafana Dashboard

The replication monitoring dashboard includes:

1. **Replication Lag Over Time** - Tracks lag trends
2. **Current Replication Lag** - Gauge with color-coded thresholds
3. **Replication Health Status** - Shows healthy (1) vs unhealthy (0) status
4. **Replication Alerts** - Displays alert activity in last 5 minutes

Access at: `http://grafana:3000/d/soroscan-perf-v1`

### Alert Configuration

Alerts are defined in `k8s/alert-rules-replication.yaml` and triggered by:

- **Warning** (yellow): Lag > 5 seconds for 2+ minutes
- **Critical** (red): Lag > 10 seconds for 1+ minute
- **Health Alert**: Replication status unhealthy for 3+ minutes
- **Monitoring Failure**: Lag checks failing for 5+ minutes

Configure alert routing in `AlertManager` to:

- Send to Slack, PagerDuty, email, etc.
- Set escalation policies
- Group related alerts

## Measurement Methods

### LSN Method (Default)

Fast method comparing PostgreSQL WAL Log Sequence Numbers:

```
Primary LSN:   0/3000000
Replica LSN:   0/2F00000
Difference:    ~1MB → ~0.1s lag (at 10MB/s replication rate)
```

**Pros:**

- Very fast (< 100ms)
- No database writes
- Works on physical replicas

**Cons:**

- Estimate based on average replication rate
- Requires direct DB access

### Write-Test Method

Accurate method using actual database writes:

```
1. Write timestamp to primary
2. Poll replica until write appears
3. Calculate time difference
```

**Pros:**

- Accurate measurement
- Real-world lag scenario
- Works with all replica types

**Cons:**

- Slower (~100ms - 5 seconds)
- Involves database writes
- Creates test records (cleaned up automatically)

## Troubleshooting

### Issue: "Could not retrieve primary/replica LSN"

**Cause:** Database connection issue or PostgreSQL version < 9.1

**Solution:**

- Verify database connectivity
- Check PostgreSQL version (requires 9.1+)
- Ensure database user has necessary permissions

### Issue: Replication lag constantly high

**Causes:**

- Network latency between primary and replica
- Replica under-resourced (CPU/disk)
- High write volume on primary

**Solution:**

- Check replica CPU, disk, network usage
- Review network latency between primary/replica
- Consider increasing replica resources
- Check for long-running queries on replica

### Issue: Alerts not firing

**Causes:**

- Prometheus not scraping metrics
- AlertManager not configured
- Alert rules not loaded

**Solution:**

- Verify `/metrics` endpoint is accessible
- Check Prometheus targets status
- Reload Prometheus configuration
- Verify AlertManager rules are loaded

### Issue: Replica not in recovery mode

**Cause:** Replica has been promoted to primary

**Solution:**

- Reconfigure database failover settings
- Update REPLICA_DB_ALIAS to point to new replica
- Update Prometheus targets

## Monitoring Best Practices

1. **Set Appropriate Thresholds**
   - Warning: 5-10 seconds (depending on application requirements)
   - Critical: 30+ seconds or business SLA requirement

2. **Alerting Strategy**
   - Include runbook URLs in alert annotations
   - Set appropriate evaluation intervals (30-60 seconds)
   - Group related alerts in AlertManager

3. **Dashboard Updates**
   - Add dashboard to team Slack channels
   - Set up dashboard refresh every 30 seconds
   - Add custom annotations for events/deployments

4. **Regular Testing**
   - Periodically test alerts (silence non-business hours)
   - Validate replica setup monthly
   - Test failover procedures quarterly

## Performance Impact

- **Lag checks:** ~50-100ms per check (LSN method)
- **Metrics overhead:** Negligible (< 1% CPU)
- **Database connections:** 1 additional connection per replica
- **Memory footprint:** ~5MB for metrics storage

## Related Issues

- Issue #537: Multi-Region Replication Monitoring
- Issue #54: Database failover automation
- Issue #56: Prometheus metrics integration
- Issue #131: Caching layer improvements

## References

- [PostgreSQL Replication Documentation](https://www.postgresql.org/docs/current/warm-standby.html)
- [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/overview/)
- [Grafana Dashboard Docs](https://grafana.com/docs/grafana/latest/dashboards/)
