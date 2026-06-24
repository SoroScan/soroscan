# Load testing

SoroScan uses [k6](https://k6.io/) to simulate realistic API traffic and surface latency or error regressions.

## Prerequisites

- Running SoroScan API (local `cargo run` / `python manage.py runserver` or deployed URL)
- [k6 installed](https://grafana.com/docs/k6/latest/set-up/install-k6/)

## Quick start

```bash
# From repo root with API on localhost:8000
k6 run load-tests/k6/smoke.js

# Scenario suite with JSON report output
mkdir -p load-tests/results
K6_REPORT_PATH=load-tests/results/scenarios-summary.json \
  k6 run load-tests/k6/scenarios.js
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://127.0.0.1:8000` | API base URL |
| `K6_VUS` | `5` | Virtual users for smoke test |
| `K6_DURATION` | `30s` / `45s` | Test duration |
| `K6_REPORT_PATH` | `load-tests/results/*.json` | JSON summary output path |

## CI

The `Load Tests` GitHub Actions workflow runs the smoke script against a temporary Django server on every push/PR to `main`.

## Reports

k6 writes machine-readable summaries to `load-tests/results/`. The stdout summary includes p95 latency, error rate, and request counts suitable for trend tracking.
