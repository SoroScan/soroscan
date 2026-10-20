import { describe, it, expect } from "vitest";
import type { ContractEventTypeInfo } from "../src/types.js";
import type { ContractEventTypeInfo as ReexportedInfo } from "../src/index.js";

describe("SC-17: ContractEventTypeInfo type definition", () => {
  it("allows constructing a valid ContractEventTypeInfo object", () => {
    const info: ContractEventTypeInfo = {
      eventType: "transfer",
      count: 1420,
      firstSeen: "2026-01-01T00:00:00Z",
      lastSeen: "2026-10-20T00:00:00Z",
      event_type: "transfer",
      first_seen: "2026-01-01T00:00:00Z",
      last_seen: "2026-10-20T00:00:00Z",
    };

    expect(info.eventType).toBe("transfer");
    expect(info.count).toBe(1420);
    expect(info.firstSeen).toBe("2026-01-01T00:00:00Z");
    expect(info.lastSeen).toBe("2026-10-20T00:00:00Z");
  });

  it("is re-exported identically from index.js", () => {
    const info: ReexportedInfo = {
      eventType: "mint",
      count: 50,
      firstSeen: "2026-05-01T00:00:00Z",
      lastSeen: "2026-05-02T00:00:00Z",
    };

    expect(info.eventType).toBe("mint");
    expect(info.count).toBe(50);
  });
});
