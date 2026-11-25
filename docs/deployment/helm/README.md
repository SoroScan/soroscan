---
slug: /deployment/helm

title: Helm Chart
description: Install and configure the SoroScan Helm chart.
sidebar_label: Helm Chart
hide_title: false
---

The Helm chart in [`helm-chart/`](../../../helm-chart) packages the SoroScan
backend, Celery workers and beat scheduler, services, ingress, configuration,
backup CronJob, and optional autoscaling/monitoring resources.

## Install

Run these commands from the repository root. Replace the image repositories and
secret values in [`values-production.yaml`](./values-production.yaml) before
installing.

```bash
helm upgrade --install soroscan ./helm-chart \
  --namespace soroscan \
  --create-namespace \
  -f docs/deployment/helm/values-production.yaml
```

To use an externally managed Secret instead of letting the chart create one, set
`secrets.create=false` and `secrets.existingSecret=<secret-name>`. The Secret
must provide the same keys the application reads, including `SECRET_KEY`,
`DATABASE_URL`, `REDIS_URL`, `SOROSCAN_CONTRACT_ID`, and `INDEXER_SECRET_KEY`.

## Validate the chart

```bash
helm lint ./helm-chart
helm template soroscan ./helm-chart \
  --namespace soroscan \
  -f docs/deployment/helm/values-production.yaml
```

## Common overrides

| Value | Description |
|-------|-------------|
| `replicaCount` | Backend replicas (ignored when `autoscaling.enabled=true`). |
| `image.repository`, `image.tag` | Backend and worker image. |
| `config` | Non-sensitive environment variables rendered into a ConfigMap. |
| `secrets.data` | Secret values written to the chart-managed Secret. |
| `celery.workers.<name>` | Per-queue worker replicas, concurrency, and resources. |
| `celery.beat.enabled` | Run the single Celery beat scheduler. |
| `backup.enabled` | Deploy the PostgreSQL backup CronJob and ConfigMap. |
| `autoscaling.enabled` | Deploy a HorizontalPodAutoscaler for the backend. |
| `podDisruptionBudget.enabled` | Deploy a PodDisruptionBudget for the backend. |
| `serviceMonitor.enabled` | Deploy a Prometheus Operator ServiceMonitor. |
| `networkPolicy.enabled` | Deploy default-deny ingress/egress plus explicit allow rules (default `false`). |
| `networkPolicy.namespace` | Namespace for the policies (defaults to the release namespace). |
| `networkPolicy.appSelector` | Pod labels for application policies (defaults to the chart's `app` label). |
| `networkPolicy.backendSelector` | Extra labels selecting only backend pods for ingress (default `component: backend`). |
| `networkPolicy.backendPort` | TCP port exposed by the backend for ingress (default `8000`). |
| `networkPolicy.ingressNamespaces` | Namespace names (with `kubernetes.io/metadata.name`) allowed to reach the backend: ingress controller, monitoring and kubelet. |
| `networkPolicy.additionalIngress` | Extra raw ingress rules appended to the backend policy. |
| `networkPolicy.dnsNamespace`, `networkPolicy.dnsPort` | Namespace and port for DNS egress (defaults `kube-system`, `53`). |
| `networkPolicy.database.enabled`, `.port`, `.cidr` | PostgreSQL egress rule (default enabled, port `5432`, CIDR `0.0.0.0/0`). |
| `networkPolicy.redis.enabled`, `.port`, `.cidr` | Redis egress rule (default enabled, port `6379`, CIDR `0.0.0.0/0`). |
| `networkPolicy.egress.except` | CIDRs excluded from the generated `ipBlock` rules (metadata endpoint by default). |
| `networkPolicy.egress.additional` | Extra raw egress rules; defaults allow HTTPS `:443` and HTTP `:80` to external services. |

### Network policies

The chart mirrors [`k8s/networkpolicy.yaml`](../../../k8s/networkpolicy.yaml):
a namespace-wide default-deny policy plus ingress allows for the backend and
egress allows for DNS, PostgreSQL, Redis and external HTTPS/HTTP. Policies are
opt-in because enabling them changes pod connectivity on existing clusters:

```bash
helm upgrade --install soroscan ./helm-chart \
  --namespace soroscan \
  --set networkPolicy.enabled=true
```

Set `networkPolicy.database.cidr` and `networkPolicy.redis.cidr` to your managed
service ranges in production; the permissive defaults only restrict the cloud
metadata endpoint.

The chart uses the release name as the resource prefix. Installing with
`--name soroscan` produces resources such as `soroscan-backend`,
`soroscan-worker-high`, `soroscan-beat`, and `soroscan-pg-backup`.
