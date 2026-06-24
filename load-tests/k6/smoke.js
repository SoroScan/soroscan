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

const jsonHeaders = { "Content-Type": "application/json" };
const okStatuses = http.expectedStatuses(200, 400, 401, 403, 429);

export default function () {
  const health = http.get(`${BASE_URL}/api/ingest/health/`, {
    tags: { name: "health" },
  });
  check(health, {
    "health status is 200": (res) => res.status === 200,
    "health payload ok": (res) => res.json("status") === "healthy",
  });

  const contracts = http.get(`${BASE_URL}/api/ingest/contracts/`, {
    tags: { name: "contracts" },
    responseCallback: http.expectedStatuses(200, 401, 403),
  });
  check(contracts, {
    "contracts endpoint reachable": (res) =>
      [200, 401, 403].includes(res.status),
  });

  const graphql = http.post(
    `${BASE_URL}/graphql/`,
    JSON.stringify({ query: "{ contracts { id } }" }),
    {
      headers: jsonHeaders,
      tags: { name: "graphql" },
      responseCallback: okStatuses,
    }
  );
  check(graphql, {
    "graphql responds": (res) => [200, 400, 401, 403, 429].includes(res.status),
    "graphql body is json": (res) => {
      try {
        res.json();
        return true;
      } catch (_) {
        return false;
      }
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
