import { describe, it, expect } from "vitest";
import { parseSC20Event } from "../src/index.js";

describe("features re-exports with .js extensions", () => {
  it("re-exports parseSC20Event correctly from main index", () => {
    const parsed = parseSC20Event({
      contractId: "C123",
      topic: "transfer",
      data: { amount: 100 },
      timestamp: 1700000000,
    });
    expect(parsed.contractId).toBe("C123");
    expect(parsed.topic).toBe("transfer");
    expect(parsed.timestamp).toBe(1700000000);
  });
});
