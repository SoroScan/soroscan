/**
 * SC-8: Annotated event emission, per-type counts, and SSE streaming tests.
 *
 * Covers:
 *   - SoroScanClient.emitAnnotatedEvent()
 *   - SoroScanClient.getEventCountByType()
 *   - SoroScanClient.streamEvents()
 *   - Type exports from index.ts
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { SoroScanClient, SoroScanError } from "../src/client.js";
import type {
  EmitAnnotatedEventParams,
  EmitAnnotatedEventResponse,
  EventCountByTypeResponse,
  StreamedEvent,
} from "../src/types.js";

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

/** Build a minimal SSE response body from an array of frames. */
function buildSseBody(
  frames: Array<{ event?: string; data: unknown }>
): string {
  return frames
    .map((f) => {
      const eventLine = f.event ? `event: ${f.event}\n` : "";
      return `${eventLine}data: ${JSON.stringify(f.data)}\n\n`;
    })
    .join("");
}

function mockSseFetch(sseBody: string, status = 200): void {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(sseBody);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoded);
      controller.close();
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(stream, {
        status,
        headers: { "Content-Type": "text/event-stream" },
      })
    )
  );
}

const BASE_URL = "https://api.soroscan.io";
const CONTRACT_ID = "CCAAA" + "A".repeat(51);
const makeClient = () =>
  new SoroScanClient({ baseUrl: BASE_URL, apiKey: "test-key" });

// ─────────────────────────────────────────────────────────────────────────────
// emitAnnotatedEvent()
// ─────────────────────────────────────────────────────────────────────────────

describe("emitAnnotatedEvent() — SC-8", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends a POST to /v1/record with all fields", async () => {
    const mockResp: EmitAnnotatedEventResponse = {
      status: "submitted",
      totalEvents: 7,
      txHash: "abc123",
      transactionStatus: "SUCCESS",
      error: null,
    };
    mockFetch(mockResp, 202);

    const client = makeClient();
    const params: EmitAnnotatedEventParams = {
      contractId: CONTRACT_ID,
      eventType: "transfer",
      payloadHash: "a".repeat(64),
      schemaVersion: 2,
    };
    const result = await client.emitAnnotatedEvent(params);

    expect(result.status).toBe("submitted");
    expect(result.totalEvents).toBe(7);
    expect(result.error).toBeNull();

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    expect(fetchCall[0]).toContain("/v1/record");
    expect(fetchCall[1]?.method).toBe("POST");

    const sentBody = JSON.parse(fetchCall[1]?.body as string);
    expect(sentBody.contractId).toBe(CONTRACT_ID);
    expect(sentBody.eventType).toBe("transfer");
    expect(sentBody.schemaVersion).toBe(2);
  });

  it("surfaces a SoroScanError on 400 (e.g. schema_version = 0)", async () => {
    mockFetch(
      { code: "VALIDATION_ERROR", message: "schemaVersion must be ≥ 1" },
      400
    );
    const client = makeClient();
    await expect(
      client.emitAnnotatedEvent({
        contractId: CONTRACT_ID,
        eventType: "swap",
        payloadHash: "b".repeat(64),
        schemaVersion: 0,
      })
    ).rejects.toBeInstanceOf(SoroScanError);
  });

  it("surfaces a SoroScanError on 401", async () => {
    mockFetch({ code: "UNAUTHORIZED", message: "Invalid API key" }, 401);
    const client = makeClient();
    await expect(
      client.emitAnnotatedEvent({
        contractId: CONTRACT_ID,
        eventType: "mint",
        payloadHash: "c".repeat(64),
        schemaVersion: 1,
      })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("handles error response with non-null error field", async () => {
    const mockResp: EmitAnnotatedEventResponse = {
      status: "failed",
      totalEvents: 0,
      txHash: null,
      transactionStatus: null,
      error: "IndexerNotFound",
    };
    mockFetch(mockResp, 202);

    const client = makeClient();
    const result = await client.emitAnnotatedEvent({
      contractId: CONTRACT_ID,
      eventType: "burn",
      payloadHash: "d".repeat(64),
      schemaVersion: 3,
    });

    expect(result.status).toBe("failed");
    expect(result.error).toBe("IndexerNotFound");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getEventCountByType()
// ─────────────────────────────────────────────────────────────────────────────

describe("getEventCountByType() — SC-8", () => {
  afterEach(() => vi.restoreAllMocks());

  const MOCK_RESPONSE: EventCountByTypeResponse = {
    contractId: null,
    totalEvents: 10,
    counts: [
      { eventType: "swap", count: 7 },
      { eventType: "transfer", count: 3 },
    ],
  };

  it("calls GET /v1/events/count-by-type with no params by default", async () => {
    mockFetch(MOCK_RESPONSE);
    const client = makeClient();
    const result = await client.getEventCountByType();

    expect(result.totalEvents).toBe(10);
    expect(result.counts).toHaveLength(2);
    expect(result.counts[0].eventType).toBe("swap");

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = fetchCall[0] as string;
    expect(url).toContain("/v1/events/count-by-type");
    // No contract_id query param
    expect(url).not.toContain("contract_id");
  });

  it("passes contract_id as query param when supplied", async () => {
    mockFetch({ ...MOCK_RESPONSE, contractId: CONTRACT_ID });
    const client = makeClient();
    await client.getEventCountByType({ contractId: CONTRACT_ID });

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain(`contract_id=${encodeURIComponent(CONTRACT_ID)}`);
  });

  it("passes include_schema_versions=true when requested", async () => {
    const respWithSv: EventCountByTypeResponse = {
      contractId: null,
      totalEvents: 5,
      counts: [
        {
          eventType: "mint",
          count: 5,
          schemaVersions: [
            { schemaVersion: 1, count: 3 },
            { schemaVersion: 2, count: 2 },
          ],
        },
      ],
    };
    mockFetch(respWithSv);
    const client = makeClient();
    const result = await client.getEventCountByType({
      includeSchemaVersions: true,
    });

    expect(result.counts[0].schemaVersions).toHaveLength(2);

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("include_schema_versions=true");
  });

  it("returns empty counts array without error when no events exist", async () => {
    mockFetch({ contractId: null, totalEvents: 0, counts: [] });
    const client = makeClient();
    const result = await client.getEventCountByType();

    expect(result.totalEvents).toBe(0);
    expect(result.counts).toEqual([]);
  });

  it("surfaces SoroScanError on 404 for unknown contract", async () => {
    mockFetch(
      { code: "NOT_FOUND", message: "Contract not found" },
      404
    );
    const client = makeClient();
    await expect(
      client.getEventCountByType({ contractId: CONTRACT_ID })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// streamEvents()
// ─────────────────────────────────────────────────────────────────────────────

describe("streamEvents() — SC-8", () => {
  afterEach(() => vi.restoreAllMocks());

  const TS = "2026-07-01T10:00:00+00:00";

  function makeEventFrame(id: number, overrides: Partial<StreamedEvent> = {}): StreamedEvent {
    return {
      id,
      contractId: CONTRACT_ID,
      contractName: "TokenX",
      type: "swap",
      payload: { amount: id * 10 },
      ledger: 9000 + id,
      eventIndex: 0,
      txHash: "e".repeat(64),
      ledgerClosedAt: TS,
      schemaVersion: 1,
      validationStatus: "passed",
      signatureStatus: "valid",
      ...overrides,
    };
  }

  it("yields parsed StreamedEvent objects from SSE frames", async () => {
    const ev1 = makeEventFrame(201);
    const ev2 = makeEventFrame(202, { type: "transfer", schemaVersion: 2 });

    const sseBody = buildSseBody([
      { event: "connected", data: { type: "connected", cursor: 0, ts: TS } },
      { data: ev1 },
      { data: ev2 },
      { event: "stream_end", data: { type: "stream_end" } },
    ]);
    mockSseFetch(sseBody);

    const client = makeClient();
    const collected: StreamedEvent[] = [];
    for await (const ev of client.streamEvents({ contractId: CONTRACT_ID })) {
      collected.push(ev);
    }

    expect(collected).toHaveLength(2);
    expect(collected[0].id).toBe(201);
    expect(collected[0].schemaVersion).toBe(1);
    expect(collected[1].id).toBe(202);
    expect(collected[1].schemaVersion).toBe(2);
  });

  it("does not yield connected or stream_end frames", async () => {
    const sseBody = buildSseBody([
      { event: "connected", data: { type: "connected", cursor: 0, ts: TS } },
      { event: "stream_end", data: { type: "stream_end" } },
    ]);
    mockSseFetch(sseBody);

    const client = makeClient();
    const collected: StreamedEvent[] = [];
    for await (const ev of client.streamEvents()) {
      collected.push(ev);
    }
    expect(collected).toHaveLength(0);
  });

  it("appends contract_id and event_type query params when supplied", async () => {
    mockSseFetch("");
    const client = makeClient();

    // Consume the (empty) generator to trigger the fetch call
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of client.streamEvents({
      contractId: CONTRACT_ID,
      eventType: "swap",
      sinceId: 55,
    })) {
      /* empty */
    }

    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain(`contract_id=${encodeURIComponent(CONTRACT_ID)}`);
    expect(url).toContain("event_type=swap");
    expect(url).toContain("since_id=55");
  });

  it("throws SoroScanError when the SSE endpoint returns 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ code: "UNAUTHORIZED", message: "Invalid key" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
    );

    const client = makeClient();
    const gen = client.streamEvents();
    await expect(gen.next()).rejects.toBeInstanceOf(SoroScanError);
  });

  it("skips malformed SSE data frames without throwing", async () => {
    const validEvent = makeEventFrame(301);
    // Inject a malformed frame between two valid ones
    const sseBody =
      `data: not-valid-json\n\n` +
      `data: ${JSON.stringify(validEvent)}\n\n`;

    mockSseFetch(sseBody);

    const client = makeClient();
    const collected: StreamedEvent[] = [];
    for await (const ev of client.streamEvents()) {
      collected.push(ev);
    }

    // Only the valid frame should be yielded
    expect(collected).toHaveLength(1);
    expect(collected[0].id).toBe(301);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Type-export smoke tests
// ─────────────────────────────────────────────────────────────────────────────

describe("SC-8 type exports from index.ts", () => {
  it("exports EmitAnnotatedEventParams type", async () => {
    const { SoroScanClient: C } = await import("../src/index.js");
    expect(C).toBeDefined();
  });

  it("emitAnnotatedEvent method exists on SoroScanClient", () => {
    const client = makeClient();
    expect(typeof client.emitAnnotatedEvent).toBe("function");
  });

  it("getEventCountByType method exists on SoroScanClient", () => {
    const client = makeClient();
    expect(typeof client.getEventCountByType).toBe("function");
  });

  it("streamEvents method exists on SoroScanClient", () => {
    const client = makeClient();
    expect(typeof client.streamEvents).toBe("function");
  });
});
