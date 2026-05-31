/**
 * Tests for Paginator helper — issue #483
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Paginator } from "../src/client.js";
import type { PaginatedResponse, ContractEvent } from "../src/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeEvent(id: string): ContractEvent {
  return {
    id,
    ledger: 1,
    ledgerClosedAt: "2024-01-01T00:00:00Z",
    txHash: "abc",
    contractId: "CCAAA",
    type: "transfer",
    topics: [],
    value: null,
    inSuccessfulContractCall: true,
    pagingToken: id,
  };
}

function makePage(
  ids: string[],
  hasNext: boolean,
  hasPrev: boolean,
  endCursor: string | null = ids[ids.length - 1] ?? null
): PaginatedResponse<ContractEvent> {
  return {
    items: ids.map(makeEvent),
    pageInfo: {
      hasNextPage: hasNext,
      hasPreviousPage: hasPrev,
      startCursor: ids[0] ?? null,
      endCursor,
    },
    totalCount: 100,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// hasNextPage / hasPreviousPage
// ─────────────────────────────────────────────────────────────────────────────

describe("Paginator.hasNextPage()", () => {
  it("returns true before any page is fetched", () => {
    const fetcher = vi.fn();
    const p = new Paginator(fetcher, {});
    expect(p.hasNextPage()).toBe(true);
  });

  it("reflects pageInfo.hasNextPage after a fetch", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a", "b"], false, false));
    const p = new Paginator(fetcher, {});
    await p.nextPage();
    expect(p.hasNextPage()).toBe(false);
  });

  it("returns true when there are more pages", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a", "b"], true, false, "cursor_b"));
    const p = new Paginator(fetcher, {});
    await p.nextPage();
    expect(p.hasNextPage()).toBe(true);
  });
});

describe("Paginator.hasPreviousPage()", () => {
  it("returns false before any page is fetched", () => {
    const fetcher = vi.fn();
    const p = new Paginator(fetcher, {});
    expect(p.hasPreviousPage()).toBe(false);
  });

  it("returns false on the first page", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a"], true, false, "cursor_a"));
    const p = new Paginator(fetcher, {});
    await p.nextPage();
    expect(p.hasPreviousPage()).toBe(false);
  });

  it("returns true after navigating to page 2", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a"], true, false, "cursor_a"))
      .mockResolvedValueOnce(makePage(["b"], false, true, "cursor_b"));
    const p = new Paginator(fetcher, {});
    await p.nextPage();
    await p.nextPage();
    expect(p.hasPreviousPage()).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// nextPage
// ─────────────────────────────────────────────────────────────────────────────

describe("Paginator.nextPage()", () => {
  it("fetches the first page with no cursor", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a"], false, false));
    const p = new Paginator(fetcher, { contractId: "CCAAA" }, 20);
    const page = await p.nextPage();

    expect(page.items).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: "CCAAA", first: 20, after: undefined })
    );
  });

  it("passes the end cursor of the previous page as `after`", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a"], true, false, "cursor_a"))
      .mockResolvedValueOnce(makePage(["b"], false, true, "cursor_b"));

    const p = new Paginator(fetcher, {}, 10);
    await p.nextPage();
    await p.nextPage();

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ after: "cursor_a" })
    );
  });

  it("throws when there is no next page", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a"], false, false));
    const p = new Paginator(fetcher, {});
    await p.nextPage();
    await expect(p.nextPage()).rejects.toThrow("no next page");
  });

  it("increments currentPageNumber", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a"], true, false, "c1"))
      .mockResolvedValueOnce(makePage(["b"], false, true, "c2"));
    const p = new Paginator(fetcher, {});
    expect(p.currentPageNumber).toBe(0);
    await p.nextPage();
    expect(p.currentPageNumber).toBe(1);
    await p.nextPage();
    expect(p.currentPageNumber).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// previousPage
// ─────────────────────────────────────────────────────────────────────────────

describe("Paginator.previousPage()", () => {
  it("throws when already on the first page", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a"], true, false, "c1"));
    const p = new Paginator(fetcher, {});
    await p.nextPage();
    await expect(p.previousPage()).rejects.toThrow("already on the first page");
  });

  it("fetches the previous page using the cached cursor", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a"], true, false, "c1"))
      .mockResolvedValueOnce(makePage(["b"], false, true, "c2"))
      .mockResolvedValueOnce(makePage(["a"], true, false, "c1")); // re-fetch page 1

    const p = new Paginator(fetcher, {}, 5);
    await p.nextPage(); // page 1
    await p.nextPage(); // page 2
    const prev = await p.previousPage(); // back to page 1

    expect(prev.items[0]?.id).toBe("a");
    expect(p.currentPageNumber).toBe(1);
    // Third call should use no cursor (page 1 starts from the beginning)
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ after: undefined })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// goToPage
// ─────────────────────────────────────────────────────────────────────────────

describe("Paginator.goToPage()", () => {
  it("throws for page numbers less than 1", async () => {
    const fetcher = vi.fn();
    const p = new Paginator(fetcher, {});
    await expect(p.goToPage(0)).rejects.toThrow("pageNumber must be ≥ 1");
  });

  it("fetches sequentially to reach an unvisited page", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a"], true, false, "c1"))
      .mockResolvedValueOnce(makePage(["b"], true, true, "c2"))
      .mockResolvedValueOnce(makePage(["c"], false, true, "c3"));

    const p = new Paginator(fetcher, {});
    const page3 = await p.goToPage(3);

    expect(page3.items[0]?.id).toBe("c");
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(p.currentPageNumber).toBe(3);
  });

  it("uses cached cursor to revisit an already-fetched page", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a"], true, false, "c1"))
      .mockResolvedValueOnce(makePage(["b"], false, true, "c2"))
      .mockResolvedValueOnce(makePage(["a"], true, false, "c1")); // revisit page 1

    const p = new Paginator(fetcher, {});
    await p.nextPage(); // page 1
    await p.nextPage(); // page 2
    const page1Again = await p.goToPage(1);

    expect(page1Again.items[0]?.id).toBe("a");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("throws when target page is beyond available pages", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a"], false, false, "c1"));

    const p = new Paginator(fetcher, {});
    await expect(p.goToPage(5)).rejects.toThrow("does not exist");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// reset
// ─────────────────────────────────────────────────────────────────────────────

describe("Paginator.reset()", () => {
  it("resets state so nextPage() fetches from the beginning", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(makePage(["a"], true, false, "c1"));

    const p = new Paginator(fetcher, {});
    await p.nextPage();
    expect(p.currentPageNumber).toBe(1);

    p.reset();
    expect(p.currentPageNumber).toBe(0);
    expect(p.currentPage).toBeNull();
    expect(p.hasNextPage()).toBe(true);
    expect(p.hasPreviousPage()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auto-calculate offsets (pageSize)
// ─────────────────────────────────────────────────────────────────────────────

describe("Paginator page size", () => {
  it("uses first param from baseParams as page size", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a"], false, false));
    const p = new Paginator(fetcher, { first: 50 });
    await p.nextPage();
    expect(fetcher).toHaveBeenCalledWith(
      expect.objectContaining({ first: 50 })
    );
  });

  it("uses constructor pageSize when first is not in baseParams", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(makePage(["a"], false, false));
    const p = new Paginator(fetcher, {}, 15);
    await p.nextPage();
    expect(fetcher).toHaveBeenCalledWith(
      expect.objectContaining({ first: 15 })
    );
  });
});
