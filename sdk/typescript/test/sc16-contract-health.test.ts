import { describe, it, expect, vi, afterEach } from "vitest";
import {
  SoroScanClient,
  SoroScanAuthenticationError,
  SoroScanNotFoundError,
  SoroScanServerError,
} from "../src/client.js";
import type { ContractHealth } from "../src/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mockFetch(body: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      })
    )
  );
}

const BASE_URL = "https://api.soroscan.io";
const CONTRACT_ID = "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF";
// A contract ID that requires percent-encoding to verify encodeURIComponent is used.
const CONTRACT_ID_SPECIAL = "CC/special?id=1";
const makeClient = () =>
  new SoroScanClient({ baseUrl: BASE_URL, apiKey: "test-key" });

const MOCK_HEALTHY: ContractHealth = {
  contractId: CONTRACT_ID,
  status: "healthy",
  lastEventTime: "2024-06-01T12:00:00Z",
  minutesSinceLastEvent: 5,
  abiDecodeErrors1h: 0,
  consecutiveFailures: 0,
  errorMessage: "",
  checkedAt: "2024-06-01T12:05:00Z",
};

const MOCK_UNHEALTHY: ContractHealth = {
  contractId: CONTRACT_ID,
  status: "unhealthy",
  lastEventTime: null,
  minutesSinceLastEvent: null,
  abiDecodeErrors1h: 3,
  consecutiveFailures: 7,
  errorMessage: "RPC timeout",
  checkedAt: "2024-06-01T12:05:00Z",
};

// ─────────────────────────────────────────────────────────────────────────────
// SC-16: getContractHealth
// ─────────────────────────────────────────────────────────────────────────────

describe("getContractHealth() — SC-16", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns a correctly-parsed healthy status", async () => {
    mockFetch(MOCK_HEALTHY);
    const result = await makeClient().getContractHealth(CONTRACT_ID);

    expect(result.contractId).toBe(CONTRACT_ID);
    expect(result.status).toBe("healthy");
    expect(result.consecutiveFailures).toBe(0);
    expect(result.abiDecodeErrors1h).toBe(0);
    expect(result.minutesSinceLastEvent).toBe(5);
    expect(result.lastEventTime).toBe("2024-06-01T12:00:00Z");
  });

  it("returns a correctly-parsed unhealthy status", async () => {
    mockFetch(MOCK_UNHEALTHY);
    const result = await makeClient().getContractHealth(CONTRACT_ID);

    expect(result.status).toBe("unhealthy");
    expect(result.consecutiveFailures).toBe(7);
    expect(result.abiDecodeErrors1h).toBe(3);
    expect(result.errorMessage).toBe("RPC timeout");
    expect(result.lastEventTime).toBeNull();
    expect(result.minutesSinceLastEvent).toBeNull();
  });

  it("calls GET on the correct URL with the contract ID path segment", async () => {
    mockFetch(MOCK_HEALTHY);
    await makeClient().getContractHealth(CONTRACT_ID);

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain(`/v1/contracts/${CONTRACT_ID}/health`);
    expect(init.method).toBe("GET");
  });

  it("percent-encodes the contract ID in the URL path", async () => {
    mockFetch(MOCK_HEALTHY);
    await makeClient().getContractHealth(CONTRACT_ID_SPECIAL);

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain(encodeURIComponent(CONTRACT_ID_SPECIAL));
    expect(url).not.toContain(CONTRACT_ID_SPECIAL);
  });

  it("includes the Authorization header with the Bearer token", async () => {
    mockFetch(MOCK_HEALTHY);
    await makeClient().getContractHealth(CONTRACT_ID);

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer test-key"
    );
  });

  it("sends no query parameters", async () => {
    mockFetch(MOCK_HEALTHY);
    await makeClient().getContractHealth(CONTRACT_ID);

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).not.toContain("?");
  });

  it("throws SoroScanAuthenticationError on 401 unauthorized", async () => {
    mockFetch({ code: "UNAUTHORIZED", message: "Invalid API key" }, 401);
    const err = await makeClient()
      .getContractHealth(CONTRACT_ID)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SoroScanAuthenticationError);
    expect((err as SoroScanAuthenticationError).statusCode).toBe(401);
    expect((err as SoroScanAuthenticationError).code).toBe("UNAUTHORIZED");
  });

  it("throws SoroScanNotFoundError on 404 not found", async () => {
    mockFetch({ code: "NOT_FOUND", message: "Contract not found" }, 404);
    const err = await makeClient()
      .getContractHealth(CONTRACT_ID)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SoroScanNotFoundError);
    expect((err as SoroScanNotFoundError).statusCode).toBe(404);
    expect((err as SoroScanNotFoundError).code).toBe("NOT_FOUND");
  });

  it("throws SoroScanServerError on 500 server error", async () => {
    mockFetch({ code: "SERVER_ERROR", message: "Internal error" }, 500);
    const err = await makeClient()
      .getContractHealth(CONTRACT_ID)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SoroScanServerError);
    expect((err as SoroScanServerError).statusCode).toBe(500);
  });
});
