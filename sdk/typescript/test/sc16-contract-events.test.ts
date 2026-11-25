import { describe, it, expect, vi, afterEach } from "vitest";
import {
  SoroScanClient,
  SoroScanAuthenticationError,
  SoroScanNotFoundError,
  SoroScanServerError,
} from "../src/client.js";
import type { ContractEvent } from "../src/types.js";

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

function makeEvent(type: string): ContractEvent {
  return {
    id: `evt-${type}`,
    ledger: 200,
    ledgerClosedAt: "2024-06-01T00:00:00Z",
    txHash: "b".repeat(64),
    contractId: CONTRACT_ID,
    type,
    topics: [],
    value: {},
    inSuccessfulContractCall: true,
    pagingToken: "1",
  };
}

const MOCK_EVENTS: ContractEvent[] = [
  makeEvent("transfer"),
  makeEvent("mint"),
  makeEvent("burn"),
];

// ─────────────────────────────────────────────────────────────────────────────
// SC-16: getContractEvents
// ─────────────────────────────────────────────────────────────────────────────

describe("getContractEvents() — SC-16", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the parsed event array on success", async () => {
    mockFetch(MOCK_EVENTS);
    const result = await makeClient().getContractEvents(CONTRACT_ID);

    expect(result).toHaveLength(3);
    expect(result[0]?.type).toBe("transfer");
    expect(result[1]?.type).toBe("mint");
    expect(result[2]?.type).toBe("burn");
  });

  it("calls GET on the correct URL with the contract ID path segment", async () => {
    mockFetch(MOCK_EVENTS);
    await makeClient().getContractEvents(CONTRACT_ID);

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain(`/v1/contracts/${CONTRACT_ID}/events`);
    expect(init.method).toBe("GET");
  });

  it("percent-encodes the contract ID in the URL path", async () => {
    mockFetch([]);
    await makeClient().getContractEvents(CONTRACT_ID_SPECIAL);

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain(encodeURIComponent(CONTRACT_ID_SPECIAL));
    expect(url).not.toContain(CONTRACT_ID_SPECIAL);
  });

  it("sends the default limit=100 as a query parameter", async () => {
    mockFetch(MOCK_EVENTS);
    await makeClient().getContractEvents(CONTRACT_ID);

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("limit=100");
  });

  it("forwards a custom limit as a query parameter", async () => {
    mockFetch(MOCK_EVENTS.slice(0, 2));
    await makeClient().getContractEvents(CONTRACT_ID, 25);

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("limit=25");
  });

  it("includes the Authorization header with the Bearer token", async () => {
    mockFetch(MOCK_EVENTS);
    await makeClient().getContractEvents(CONTRACT_ID);

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer test-key"
    );
  });

  it("returns an empty array when no events exist", async () => {
    mockFetch([]);
    const result = await makeClient().getContractEvents(CONTRACT_ID);
    expect(result).toEqual([]);
  });

  it("throws SoroScanAuthenticationError on 401 unauthorized", async () => {
    mockFetch({ code: "UNAUTHORIZED", message: "Invalid API key" }, 401);
    const err = await makeClient()
      .getContractEvents(CONTRACT_ID)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SoroScanAuthenticationError);
    expect((err as SoroScanAuthenticationError).statusCode).toBe(401);
    expect((err as SoroScanAuthenticationError).code).toBe("UNAUTHORIZED");
  });

  it("throws SoroScanNotFoundError on 404 not found", async () => {
    mockFetch({ code: "NOT_FOUND", message: "Contract not found" }, 404);
    const err = await makeClient()
      .getContractEvents(CONTRACT_ID)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SoroScanNotFoundError);
    expect((err as SoroScanNotFoundError).statusCode).toBe(404);
    expect((err as SoroScanNotFoundError).code).toBe("NOT_FOUND");
  });

  it("throws SoroScanServerError on 500 server error", async () => {
    mockFetch({ code: "SERVER_ERROR", message: "Internal error" }, 500);
    const err = await makeClient()
      .getContractEvents(CONTRACT_ID)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SoroScanServerError);
    expect((err as SoroScanServerError).statusCode).toBe(500);
  });
});
