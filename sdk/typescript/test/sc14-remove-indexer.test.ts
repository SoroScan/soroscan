import { describe, it, expect, vi, afterEach } from "vitest";
import { SoroScanClient } from "../src/client.js";

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

describe("removeIndexer() — SC-14", () => {
  afterEach(() => vi.restoreAllMocks());

  it("posts to /api/ingest/indexers/remove/", async () => {
    mockFetch(
      {
        status: "submitted",
        txHash: "txremove001",
        transactionStatus: "pending",
        error: null,
      },
      202
    );

    const client = new SoroScanClient({
      baseUrl: "https://api.soroscan.io",
      apiKey: "test-key",
    });
    const result = await client.removeIndexer({
      indexerAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    });

    expect(result.txHash).toBe("txremove001");
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("/api/ingest/indexers/remove/");
  });
});
