import { afterEach, describe, expect, it, vi } from "vitest";
import { SoroScanClient, SoroScanError } from "../src/client.js";

const BASE_URL = "https://api.soroscan.io";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const emptyPage = {
  items: [],
  pageInfo: {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  },
  totalCount: 0,
};

describe("SoroScanClient retry backoff", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("retries transient 5xx responses and returns the later success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ code: "SERVER_ERROR", message: "temporary" }, 503)
      )
      .mockResolvedValueOnce(jsonResponse(emptyPage, 200));
    vi.stubGlobal("fetch", fetchMock);

    const client = new SoroScanClient({
      baseUrl: BASE_URL,
      maxRetries: 2,
      initialDelayMs: 0,
      maxDelayMs: 0,
    });

    const result = await client.getEvents();
    expect(result.totalCount).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries HTTP 429 responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ code: "RATE_LIMITED", message: "slow down" }, 429)
      )
      .mockResolvedValueOnce(jsonResponse(emptyPage, 200));
    vi.stubGlobal("fetch", fetchMock);

    const client = new SoroScanClient({
      baseUrl: BASE_URL,
      maxRetries: 1,
      initialDelayMs: 0,
      maxDelayMs: 0,
    });

    await client.getEvents();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops retrying after maxRetries is exhausted", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ code: "SERVER_ERROR", message: "still failing" }, 503)
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = new SoroScanClient({
      baseUrl: BASE_URL,
      maxRetries: 2,
      initialDelayMs: 0,
      maxDelayMs: 0,
    });

    await expect(client.getEvents()).rejects.toBeInstanceOf(SoroScanError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry ordinary 4xx responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ code: "BAD_REQUEST", message: "invalid request" }, 400)
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = new SoroScanClient({
      baseUrl: BASE_URL,
      maxRetries: 3,
      initialDelayMs: 0,
      maxDelayMs: 0,
    });

    await expect(client.getEvents()).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses full jitter bounded by the exponential backoff ceiling", async () => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ code: "SERVER_ERROR", message: "temporary" }, 500)
      )
      .mockResolvedValueOnce(jsonResponse(emptyPage, 200));
    vi.stubGlobal("fetch", fetchMock);

    const client = new SoroScanClient({
      baseUrl: BASE_URL,
      maxRetries: 1,
      initialDelayMs: 100,
      maxDelayMs: 1_000,
    });

    const request = client.getEvents();
    await vi.advanceTimersByTimeAsync(49);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await request;

    expect(randomSpy).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
