import { describe, it, expect, vi, afterEach } from "vitest";
import { SoroScanClient } from "../src/client.js";
import { SoroScanError } from "../src/errors.js";
import type { TestWebhookResponse } from "../src/index.js";

const BASE_URL = "https://api.soroscan.io";

function mockFetch(body: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        })
      )
    )
  );
}

describe("SoroScanClient.testWebhook()", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls POST /v1/webhooks/:id/test and returns TestWebhookResponse", async () => {
    const mockResponse: TestWebhookResponse = {
      status: "test_webhook_queued",
    };
    mockFetch(mockResponse, 200);

    const client = new SoroScanClient({ baseUrl: BASE_URL, apiKey: "test-api-key" });
    const result = await client.testWebhook("wh_abc123");

    expect(result).toEqual(mockResponse);
    expect(result.status).toBe("test_webhook_queued");

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit
    ];
    expect(url).toBe(`${BASE_URL}/v1/webhooks/wh_abc123/test`);
    expect(init.method).toBe("POST");
  });

  it("supports numeric webhook IDs", async () => {
    mockFetch({ status: "test_webhook_queued" }, 200);

    const client = new SoroScanClient({ baseUrl: BASE_URL, apiKey: "test-api-key" });
    const result = await client.testWebhook(1042);

    expect(result.status).toBe("test_webhook_queued");

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit
    ];
    expect(url).toBe(`${BASE_URL}/v1/webhooks/1042/test`);
  });

  it("encodes special characters in webhookId", async () => {
    mockFetch({ status: "test_webhook_queued" }, 200);

    const client = new SoroScanClient({ baseUrl: BASE_URL, apiKey: "test-api-key" });
    await client.testWebhook("sub/tier#1?x=y");

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit
    ];
    expect(url).toBe(`${BASE_URL}/v1/webhooks/sub%2Ftier%231%3Fx%3Dy/test`);
  });

  it("attaches Authorization header when apiKey is configured", async () => {
    mockFetch({ status: "test_webhook_queued" }, 200);

    const client = new SoroScanClient({ baseUrl: BASE_URL, apiKey: "secret-key-999" });
    await client.testWebhook("wh_001");

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit
    ];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer secret-key-999");
  });

  it("throws typed SoroScanError when endpoint responds with 404", async () => {
    mockFetch({ code: "NOT_FOUND", message: "Webhook subscription not found" }, 404);

    const client = new SoroScanClient({ baseUrl: BASE_URL });
    await expect(client.testWebhook("missing_wh")).rejects.toBeInstanceOf(SoroScanError);
    await expect(client.testWebhook("missing_wh")).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });

  it("throws typed SoroScanError when endpoint responds with 500", async () => {
    mockFetch({ code: "INTERNAL_ERROR", message: "Webhook delivery service error" }, 500);

    const client = new SoroScanClient({ baseUrl: BASE_URL });
    await expect(client.testWebhook("wh_500")).rejects.toBeInstanceOf(SoroScanError);
    await expect(client.testWebhook("wh_500")).rejects.toMatchObject({
      statusCode: 500,
      code: "INTERNAL_ERROR",
    });
  });
});
