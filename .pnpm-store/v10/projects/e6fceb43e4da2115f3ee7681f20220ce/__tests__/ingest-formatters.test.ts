import {
  shortHash,
  toDateTimeInputValue,
  toIsoOrNull,
  validateDateRange,
} from "@/components/ingest/formatters";

describe("ingest formatter helpers", () => {
  it("validates date range pairs", () => {
    expect(validateDateRange("2026-02-20T10:00", "")).toContain("Provide both");
    expect(validateDateRange("", "2026-02-21T10:00")).toContain("Provide both");
    expect(validateDateRange("2026-02-22T11:00", "2026-02-22T10:00")).toContain(
      "start date must be before end date",
    );
    expect(validateDateRange("2026-02-22T09:00", "2026-02-22T10:00")).toBe("");
  });

  it("formats and normalizes hash/date values", () => {
    expect(shortHash("abcdef")).toBe("abcdef");
    expect(shortHash("12345678abcdefghijklmnop")).toBe("12345678...klmnop");

    expect(toIsoOrNull("")).toBeNull();
    expect(toIsoOrNull("2026-02-22T10:30")).toContain("2026-02-22T");

    expect(toDateTimeInputValue("invalid")).toBe("");
    expect(toDateTimeInputValue("2026-02-22T10:30:00.000Z")).toMatch(
      /^2026-02-\d{2}T\d{2}:\d{2}$/,
    );
  });
});
