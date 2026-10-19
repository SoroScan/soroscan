/**
 * SoroScan k6 stress test scenario.
 *
 * Progressively increases concurrency to find breaking points, measure
 * autoscaling responsiveness (HPA), and verify graceful recovery under spike load.
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

const PEAK_VUS = Number(__ENV.K6_STRESS_PEAK_VUS || 50);
const DEFAULT_DURATION = __ENV.K6_DURATION || "1m";

export const options = {
  scenarios: {
    stress_ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: __ENV.K6_STAGE_1 || "30s", target: Math.floor(PEAK_VUS * 0.25) }, // Warm-up
        { duration: __ENV.K6_STAGE_2 || DEFAULT_DURATION, target: Math.floor(PEAK_VUS * 0.5) },  // Normal high
        { duration: __ENV.K6_STAGE_3 || "2m", target: PEAK_VUS },                     // Peak stress
        { duration: __ENV.K6_STAGE_4 || DEFAULT_DURATION, target: Math.floor(PEAK_VUS * 1.5) },   // Overload probe
        { duration: __ENV.K6_STAGE_5 || "30s", target: 0 },                           // Recovery ramp-down
      ],
      exec: "stressFlow",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"], // Failure rate must remain under 5% across the ramp
    http_req_duration: ["p(95)<4000", "p(99)<8000"], // Latency allowance under peak stress
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

export function stressFlow() {
  group("stress_probe", () => {
    // Health probe
    const health = http.get(`${BASE_URL}/api/ingest/health/`, {
      tags: { name: "health" },
    });
    check(health, { "health reachable": (r) => r.status === 200 });

    // Read queries under stress
    const contracts = http.get(`${BASE_URL}/api/ingest/contracts/`, {
      headers: authHeaders(),
      tags: { name: "contracts" },
      responseCallback: http.expectedStatuses(200, 401, 403, 429, 503),
    });
    check(contracts, {
      "contracts responds cleanly": (r) => [200, 401, 403, 429, 503].includes(r.status),
    });

    const events = http.get(`${BASE_URL}/api/ingest/events/?limit=50`, {
      headers: authHeaders(),
      tags: { name: "events" },
      responseCallback: http.expectedStatuses(200, 401, 403, 429, 503),
    });
    check(events, {
      "events responds cleanly": (r) => [200, 401, 403, 429, 503].includes(r.status),
    });
  });

  sleep(0.2);
}

export function handleSummary(data) {
  const reportPath = __ENV.K6_REPORT_PATH || "load-tests/results/stress-summary.json";
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    [reportPath]: JSON.stringify(data, null, 2),
  };
}
