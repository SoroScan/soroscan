# SoroScan Kubernetes Manifests

This directory contains the production-grade Kubernetes manifests for deploying and operating the **SoroScan** platform.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Manifests Inventory](#manifests-inventory)
- [Recommended Apply Order](#recommended-apply-order)
- [Configuration & Secrets Setup](#configuration--secrets-setup)
- [Verification & Operational Commands](#verification--operational-commands)
- [Observability & Monitoring](#observability--monitoring)

---

## 🌐 Overview

The deployment architecture consists of:
- **API & Ingestion Service**: Django + ASGI backend running Gunicorn/Uvicorn, handling REST endpoints and real-time WebSockets.
- **Background Workers**: Tiered Celery workers (`high`, `default`, `low`) for asynchronous transaction ingestion, webhook dispatching, and data retention tasks.
- **Scheduler**: A dedicated single-replica Celery Beat daemon for periodic tasks.
- **Maintenance**: Scheduled PostgreSQL database backup jobs.
- **Networking & Ingress**: ClusterIP Service and NGINX Ingress with automatic TLS termination via `cert-manager`.
- **Observability**: Prometheus Operator integration (`ServiceMonitor`, `PrometheusRule`) and prebuilt Grafana dashboards.

---

## 🛠 Prerequisites

Before applying these manifests, ensure the following are available in your Kubernetes cluster:

1. **Kubernetes Cluster**: Version `v1.26` or higher.
2. **`kubectl`**: Configured with cluster-admin privileges or appropriate namespace RBAC.
3. **Ingress Controller**: e.g., `ingress-nginx`.
4. **Cert-Manager**: For automated TLS certificate provisioning (`cert-manager.io/cluster-issuer`).
5. **Prometheus Operator**: (Optional but recommended) `kube-prometheus-stack` providing `ServiceMonitor` and `PrometheusRule` Custom Resource Definitions (CRDs).
6. **Secret Management**: External Secrets Operator (AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault) or manually provisioned Kubernetes `Secret`.

---

## 📁 Manifests Inventory

| File | Kubernetes Kind | Resource Name | Purpose |
| :--- | :--- | :--- | :--- |
| `namespace.yaml` | `Namespace` | `soroscan` | Dedicated namespace isolating all SoroScan resources. |
| `configmap.yaml` | `ConfigMap` | `soroscan-config` | Shared environment configuration (Django settings, log levels, Redis/DB hosts). |
| `secret-reference.yaml` | `ExternalSecret` | `soroscan-secrets` | Reference template for injecting sensitive credentials (SECRET_KEY, DB passwords). |
| `backup-configmap.yaml` | `ConfigMap` | `soroscan-backup-config` | Shell scripts and configuration for scheduled database backups. |
| `service.yaml` | `Service` | `soroscan-backend` | ClusterIP service exposing backend HTTP/WebSocket on port `8000`. |
| `backend-deployment.yaml` | `Deployment` | `soroscan-backend` | Replicated backend pods with readiness/liveness probes and resource limits. |
| `worker-deployment.yaml` | `Deployment` | `soroscan-worker-*` | Replicated Celery worker deployments partitioned by queue priority (`high`, `default`, `low`). |
| `beat-cronjob.yaml` | `Deployment` | `soroscan-celery-beat` | Single-replica scheduler daemon running Celery Beat (avoids duplicate runs). |
| `backup-cronjob.yaml` | `CronJob` | `soroscan-pg-backup` | Nightly cron job creating and compressing PostgreSQL database dumps. |
| `ingress.yaml` | `Ingress` | `soroscan-ingress` | TLS-enabled ingress routing external traffic to `soroscan-backend`. |
| `servicemonitor.yaml` | `ServiceMonitor` | `soroscan-backend` | Prometheus Operator target scraping `/metrics` on port `8000`. |
| `prometheus-rules.yaml` | `PrometheusRule` | `soroscan-alerts` | Alerting rules for high error rates, crash loops, and slow queries. |
| `grafana-dashboard.json` | JSON Dashboard | N/A | Dashboard definition for platform request rates, latency, and queue depths. |
| `grafana-templates/` | ConfigMaps / Files | N/A | Provisioning templates for Grafana datasources and dashboard providers. |

---

## 🚀 Recommended Apply Order

To ensure dependencies are satisfied, manifests should be applied in sequential phases:

### Phase 1: Namespace, Configuration & Secrets
Create the namespace and load runtime configurations and credentials first:
```bash
# 1. Create the dedicated namespace
kubectl apply -f k8s/namespace.yaml

# 2. Apply non-sensitive configuration
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/backup-configmap.yaml

# 3. Apply secrets (External Secrets or manual Kubernetes secret)
# Note: Ensure soroscan-secrets is created before proceeding!
# Example if using ExternalSecret:
kubectl apply -f k8s/secret-reference.yaml
```

### Phase 2: Services & Workloads
Once configurations and secrets are in place, deploy the services and application workloads:
```bash
# 4. Create internal ClusterIP service
kubectl apply -f k8s/service.yaml

# 5. Deploy backend API pods
kubectl apply -f k8s/backend-deployment.yaml

# 6. Deploy Celery workers and scheduler
kubectl apply -f k8s/worker-deployment.yaml
kubectl apply -f k8s/beat-cronjob.yaml

# 7. Apply maintenance backup CronJob
kubectl apply -f k8s/backup-cronjob.yaml
```

### Phase 3: External Access
Expose the backend service to external ingress traffic:
```bash
# 8. Apply Ingress with TLS
kubectl apply -f k8s/ingress.yaml
```

### Phase 4: Monitoring & Observability
If Prometheus Operator is enabled in the cluster:
```bash
# 9. Apply ServiceMonitor and Alerting rules
kubectl apply -f k8s/servicemonitor.yaml
kubectl apply -f k8s/prometheus-rules.yaml

# 10. (Optional) Apply Grafana provisioning templates
kubectl apply -f k8s/grafana-templates/
```

---

## 🔐 Configuration & Secrets Setup

Before workloads can start successfully, the `soroscan-secrets` Secret must exist in namespace `soroscan`.

If not using External Secrets Operator, you can generate a native Secret using:
```bash
kubectl create secret generic soroscan-secrets \
  --namespace=soroscan \
  --from-literal=SECRET_KEY="<strong-random-django-secret-key>" \
  --from-literal=DATABASE_URL="postgres://soroscan_user:password@postgres-host:5432/soroscan" \
  --from-literal=CELERY_BROKER_URL="redis://:password@redis-host:6379/0" \
  --from-literal=AWS_ACCESS_KEY_ID="<aws-key>" \
  --from-literal=AWS_SECRET_ACCESS_KEY="<aws-secret>"
```

---

## 🔍 Verification & Operational Commands

Check rollout status and pod health:
```bash
# Check all resources in the soroscan namespace
kubectl get all -n soroscan

# Verify backend deployment rollout
kubectl rollout status deployment/soroscan-backend -n soroscan

# Verify worker deployments rollout
kubectl rollout status deployment/soroscan-worker-high -n soroscan
kubectl rollout status deployment/soroscan-worker-default -n soroscan

# Stream backend logs
kubectl logs -n soroscan -l app.kubernetes.io/name=soroscan-backend -f --tail=100

# Stream worker logs
kubectl logs -n soroscan -l app.kubernetes.io/name=soroscan-worker -f --tail=100
```

Run database migrations manually if needed:
```bash
kubectl exec -it -n soroscan deploy/soroscan-backend -- python manage.py migrate
```

---

## 📊 Observability & Monitoring

1. **Metrics Scraping**: `servicemonitor.yaml` configures Prometheus to scrape `http://soroscan-backend:8000/metrics` every 30 seconds.
2. **Alerts**: `prometheus-rules.yaml` defines alerts under group `soroscan.rules` for:
   - High HTTP 5xx error rate (> 5% over 5m)
   - High request latency (p95 > 2s over 5m)
   - Pod crash loops or memory throttling
   - Celery queue backlog accumulation
3. **Dashboards**: Import `grafana-dashboard.json` into Grafana to inspect real-time request rates, latency percentiles, active connections, and task worker statistics.
