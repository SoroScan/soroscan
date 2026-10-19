/**
 * SoroScan k6 soak test scenario.
 *
 * Designed to test system stability, memory leaks, connection pool retention,
 * and performance degradation over an extended period of sustained moderate load.
 *
 * Configurable via environment variables. Refuses production targets unless
 * ALLOW_PRODUCTION_LOAD=true.
 */
import http from "k6/http";
import { check, group, sleep } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
import { assertSafeTarget } from "./lib/safety.js";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:8000";
const TOKEN_USER = __ENV.K6_USERNAME || "";
const TOKEN_PASSWORD = __ENV.K6_PASSWORD || "";
const API_TOKEN = __ENV.K6_API_TOKEN || "";

const SOAK_VUS = Number(__ENV.K6_SOAK_VUS || 10);
const RAMP_TIME = __ENV.K6_SOAK_RAMP || "2m";
const STEADY_TIME = __ENV.K6_SOAK_DURATION || __ENV.K6_DURATION || "30m";

export const options = {
  scenarios: {
    soak_traffic: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: RAMP_TIME, target: SOAK_VUS },
        { duration: STEADY_TIME, target: SOAK_VUS },
        { duration: RAMP_TIME, target: 0 },
      ],
      exec: "soakFlow",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"], // Failure rate must stay below 2%
    http_req_duration: ["p(95)<2500", "p(99)<5000"], // 95% of requests under 2.5s, 99% under 5s
    "http_req_duration{endpoint:health}": ["p(95)<500"],
    "http_req_duration{endpoint:events}": ["p(95)<3000"],
    "http_req_duration{endpoint:contracts}": ["p(95)<2500"],
  },
};

function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (API_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`;
  }
  return headers;
}

export function setup() {
  assertSafeTarget(BASE_URL);
  let token = API_TOKEN;
  if (!token && TOKEN_USER && TOKEN_PASSWORD) {
    const res = http.post(
      `${BASE_URL}/api/token/`,
      JSON.stringify({ username: TOKEN_USER, password: TOKEN_PASSWORD }),
      { headers: { "Content-Type": "application/json" } }
    );
    if (res.status === 200) {
      try {
        token = res.json("access") || "";
      } catch (err) {
        token = "";
      }
    }
  }
  return { token };
}

export function soakFlow() {
  // 1. Health & Liveness
  group("soak_health", () => {
    const health = http.get(`${BASE_URL}/health/`, {
      tags: { endpoint: "health" },
    });
    check(health, { "health 200": (r) => r.status === 200 });

    const ingestHealth = http.get(`${BASE_URL}/api/ingest/health/`, {
      tags: { endpoint: "health" },
    });
    check(ingestHealth, { "ingest health 200": (r) => r.status === 200 });
  });

  sleep(0.5);

  // 2. Browse Contracts & Metadata
  group("soak_contracts", () => {
    const contracts = http.get(`${BASE_URL}/api/ingest/contracts/`, {
      headers: authHeaders(),
      tags: { endpoint: "contracts" },
      responseCallback: http.expectedStatuses(200, 401, 403),
    });
    check(contracts, {
      "contracts response valid": (r) => [200, 401, 403].includes(r.status),
    });
  });

  sleep(0.5);

  // 3. Query Events & V1 Feed
  group("soak_events", () => {
    const events = http.get(`${BASE_URL}/api/ingest/events/?limit=20`, {
      headers: authHeaders(),
      tags: { endpoint: "events" },
      responseCallback: http.expectedStatuses(200, 401, 403),
    });
    check(events, {
      "events list responds": (r) => [200, 401, 403].includes(r.status),
    });

    const v1 = http.get(`${BASE_URL}/v1/events?first=10`, {
      headers: authHeaders(),
      tags: { endpoint: "events" },
      responseCallback: http.expectedStatuses(200, 401, 403),
    });
    check(v1, {
      "v1 events responds": (r) => [200, 401, 403].includes(r.status),
    });
  });

  sleep(1);
}

export function handleSummary(data) {
  const reportPath = __ENV.K6_REPORT_PATH || "load-tests/results/soak-summary.json";
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    [reportPath]: JSON.stringify(data, null, 2),
  };
}
