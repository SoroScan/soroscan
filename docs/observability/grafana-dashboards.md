# Packaged Grafana Dashboards

SoroScan ships five ready-to-import Grafana dashboards in
[`k8s/grafana-templates/`](https://github.com/SoroScan/soroscan/tree/main/k8s/grafana-templates),
plus Kubernetes provisioning files for the Prometheus datasource and the dashboard provider.
This page explains how to load them and what each one shows. See the
[Observability Guide](./index.md) for the overall strategy and the
[Monitoring deployment guide](../deployment/monitoring.md) for Prometheus setup.

| Dashboard | File | UID |
|-----------|------|-----|
| System Health Overview | `system-health-overview.json` | `soroscan-system-health-template` |
| Event Ingestion Metrics | `event-ingestion-metrics.json` | `soroscan-ingestion-template` |
| Webhook Delivery Status | `webhook-delivery-status.json` | `soroscan-webhook-template` |
| Performance Analysis | `performance-analysis.json` | `soroscan-performance-template` |
| Celery Task Queue | `celery-task-queue.json` | `soroscan-celery-queue` |

## Importing a template

1. Open Grafana and go to **Dashboards → New → Import**.
2. Upload one of the JSON files from `k8s/grafana-templates/`.
3. When prompted for the `DS_PROMETHEUS` input, select your Prometheus datasource.
   Every panel uses this input, so the dashboard is not tied to a datasource name.
4. Click **Import**, then adjust the variable defaults for your environment.

### Dashboard variables

| Variable | Dashboards | Purpose |
|----------|-----------|---------|
| `namespace` | System Health Overview only | Kubernetes namespace, populated from `label_values(kube_pod_info, namespace)` (requires kube-state-metrics). |
| `job` | All | Prometheus `job` label of the SoroScan scrape target. |
| `instance` | All | Prometheus `instance` label, filtered by the selected `job`. |

All three variables are multi-value queries against Prometheus, so a single dashboard
can cover several replicas or environments.

Each dashboard also defines one annotation track to correlate events on the timeline:
*Deployments* (System Health), *Ingestion incidents*, *Retry spikes* (Webhooks),
*Performance regressions*, and *Queue backlog* (Celery).

## Provisioning in Kubernetes

Two ConfigMaps in `k8s/` provision Grafana automatically instead of importing by hand. Both
live in the `monitoring` namespace.

**Datasource** — [`k8s/grafana-datasource.yaml`](https://github.com/SoroScan/soroscan/blob/main/k8s/grafana-datasource.yaml)
(label `grafana_datasource: "1"`) defines a default, non-editable Prometheus datasource named
`Prometheus` at `http://prometheus-server.monitoring.svc.cluster.local:9090`.

**Dashboard provider** — [`k8s/grafana-dashboard-provider.yaml`](https://github.com/SoroScan/soroscan/blob/main/k8s/grafana-dashboard-provider.yaml)
(label `grafana_dashboard: "1"`) registers a file provider named `default` that loads
dashboards from `/var/lib/grafana/dashboards`, rescans every 10 seconds, and allows UI edits.

```bash
kubectl apply -f k8s/grafana-datasource.yaml
kubectl apply -f k8s/grafana-dashboard-provider.yaml
```

The provider only tells Grafana where to look: mount the dashboard JSON files at
`/var/lib/grafana/dashboards` (for example from a ConfigMap built from
`k8s/grafana-templates/`). If you provision this way, the `DS_PROMETHEUS` input is not
prompted for, so make sure the dashboards resolve to the provisioned `Prometheus` datasource
(or import them through the UI once and re-export).

## System Health Overview

**Purpose:** one-screen view of service uptime, error rates, queue pressure and worker
runtime. Start here during an incident.

| Panel | Type | Metrics |
|-------|------|---------|
| Service Up | stat | `up` |
| HTTP Error Rate | time series (5xx and 4xx) | `django_http_responses_total_by_status_total` |
| Celery Queue Depth | time series | `celery_worker_tasks_active` |
| DB Error Count | time series | `django_db_errors_total` |
| Worker Runtime p95 | time series | `celery_task_runtime_seconds_bucket` |

## Event Ingestion Metrics

**Purpose:** track throughput and health of the ingestion tasks (Celery tasks whose name
matches `.*ingest.*`).

| Panel | Type | Metrics |
|-------|------|---------|
| Events Indexed / min | time series | `celery_tasks_total{state="SUCCESS"}` |
| Ingestion Failures / min | time series | `celery_tasks_total{state="FAILURE"}` |
| Task Runtime p95 | time series | `celery_task_runtime_seconds_bucket` |
| Deduplication and DB Errors | time series | `django_db_errors_total` (by `type`) |

## Webhook Delivery Status

**Purpose:** monitor webhook delivery reliability (Celery tasks whose name matches
`.*webhook.*`): success rate, retries, latency and failures.

| Panel | Type | Metrics |
|-------|------|---------|
| Webhook Success Rate | time series (percent) | `celery_tasks_total` (`SUCCESS` / all) |
| Webhook Retry Throughput | time series | `celery_tasks_total{name=~".*webhook.*retry.*"}` |
| Webhook Delivery Runtime p95 | time series | `celery_task_runtime_seconds_bucket` |
| Failure Breakdown | table (by task name) | `celery_tasks_total{state="FAILURE"}` |

## Performance Analysis

**Purpose:** API latency percentiles, per-view traffic, database query latency and the
slowest views, for spotting regressions.

| Panel | Type | Metrics |
|-------|------|---------|
| API Latency Percentiles | time series (p50/p95/p99) | `django_http_requests_latency_seconds_bucket` |
| Request Rate by View | time series | `django_http_requests_total_by_view_transport_method_total` |
| DB Query Latency p95 | time series (by `vendor`) | `django_db_execute_many_duration_seconds_bucket` |
| Top Slow Views (avg latency) | table (top 10) | `django_http_requests_latency_seconds_sum` / `_count` |

## Celery Task Queue

**Purpose:** queue depth, task throughput, failures, duration and worker availability. It
uses SoroScan's own `soroscan_celery_*` metrics; see
[Celery Task Queue Monitoring](../features/celery-task-queue-monitoring.md) for details.

| Panel | Type | Metrics |
|-------|------|---------|
| Queue Depth | time series | `soroscan_celery_queue_depth` |
| Active Tasks | time series (by `task_name`) | `soroscan_celery_tasks_active` |
| Completed and Failed Tasks | time series (by `status`, `task_name`) | `soroscan_celery_tasks_total` |
| Average Task Duration | time series | `soroscan_celery_task_duration_seconds_sum` / `_count` |
| Workers Online | stat | `soroscan_celery_workers_online` |

## Required metric sources

Dashboards show "No data" if the matching exporter is not scraped:

- `django_*` metrics: django-prometheus on the API.
- `celery_*` metrics: a Celery exporter scraping the workers.
- `soroscan_celery_*` metrics: SoroScan's built-in exporter.
- `kube_pod_info`: kube-state-metrics (only for the `namespace` variable).
