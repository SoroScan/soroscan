/**
 * SoroScan k6 smoke load test.
 *
 * Exercises health checks and a lightweight GraphQL query against a running API.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

export const options = {
  vus: Number(__ENV.K6_VUS || 5),
  duration: __ENV.K6_DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:8000";

export default function () {
  const health = http.get(`${BASE_URL}/api/ingest/health/`);
  check(health, {
    "health status is 200": (res) => res.status === 200,
    "health payload ok": (res) => res.json("status") === "healthy",
  });

  const graphql = http.post(
    `${BASE_URL}/graphql/`,
    JSON.stringify({ query: "{ contracts { id } }" }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(graphql, {
    "graphql status is 200": (res) => res.status === 200,
    "graphql has data or errors": (res) => {
      const body = res.json();
      return body.data !== undefined || body.errors !== undefined;
    },
  });

  sleep(1);
}

export function handleSummary(data) {
  const reportPath = __ENV.K6_REPORT_PATH || "load-tests/results/smoke-summary.json";
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    [reportPath]: JSON.stringify(data, null, 2),
  };
}
