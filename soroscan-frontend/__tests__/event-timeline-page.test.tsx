import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EventTimelinePage from "@/app/event-timeline/page";
import { adaptTransactionEvent, isValidTxHash } from "@/lib/transaction-timeline-api";

const TX = "a".repeat(64);
let mockSearch = "";
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/event-timeline",
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const json = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const EVENT = {
  id: 11,
  contract_id: "CTOKEN",
  contract_name: "Token",
  event_type: "transfer",
  payload: { raw: true },
  decoded_payload: { amount: "250" },
  ledger: 520001,
  event_index: 0,
  timestamp: "2026-11-01T10:00:00Z",
  tx_hash: TX,
  status: "CONFIRMED",
};

const fetchMock = jest.fn();

beforeEach(() => {
  mockSearch = "";
  mockReplace.mockReset();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("transaction timeline helpers", () => {
  it("validates 64-character hex hashes", () => {
    expect(isValidTxHash(TX)).toBe(true);
    expect(isValidTxHash(TX.toUpperCase())).toBe(true);
    expect(isValidTxHash("tx-7f21")).toBe(false);
    expect(isValidTxHash("g".repeat(64))).toBe(false);
  });

  it("maps API events to timeline events", () => {
    expect(adaptTransactionEvent(EVENT, TX)).toEqual({
      id: "11",
      transactionId: TX,
      eventType: "transfer",
      title: "transfer on Token",
      timestamp: "2026-11-01T10:00:00Z",
      status: "success",
      contractId: "CTOKEN",
      txHash: TX,
      ledger: 520001,
      parentEventId: null,
      details: { amount: "250" },
    });
    expect(adaptTransactionEvent({ ...EVENT, status: "PENDING_REORG" }, TX).status).toBe("pending");
    expect(adaptTransactionEvent({ ...EVENT, status: "ORPHANED", decoded_payload: null }, TX)).toMatchObject({
      status: "error",
      details: { raw: true },
    });
  });
});

describe("EventTimelinePage", () => {
  it("prompts for a hash and does not fetch without one", () => {
    render(<EventTimelinePage />);
    expect(screen.getByText("Enter a transaction hash to see its events.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads the transaction from the ?tx query param", async () => {
    mockSearch = `tx=${TX}`;
    fetchMock.mockResolvedValue(json({ transaction_id: TX, event_count: 1, events: [EVENT] }));
    render(<EventTimelinePage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading transaction events");
    expect(await screen.findByText("transfer on Token")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`http://localhost:8000/api/ingest/transactions/${TX}/`, { cache: "no-store" });
  });

  it("rejects an invalid hash without calling the API", () => {
    mockSearch = "tx=tx-7f21";
    render(<EventTimelinePage />);
    expect(screen.getByRole("alert")).toHaveTextContent("not a valid transaction hash");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a not-found state when the transaction has no events", async () => {
    mockSearch = `tx=${TX}`;
    fetchMock.mockResolvedValue(json({ transaction_id: TX, event_count: 0, events: [] }));
    render(<EventTimelinePage />);
    expect(await screen.findByText(/No indexed events found for this transaction/)).toBeInTheDocument();
  });

  it("shows an error with retry when the request fails", async () => {
    mockSearch = `tx=${TX}`;
    fetchMock
      .mockResolvedValueOnce(json({ detail: "boom" }, 500))
      .mockResolvedValueOnce(json({ transaction_id: TX, event_count: 1, events: [EVENT] }));
    render(<EventTimelinePage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load transaction (HTTP 500).");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("transfer on Token")).toBeInTheDocument();
  });

  it("puts a submitted hash in the URL", async () => {
    render(<EventTimelinePage />);
    fireEvent.change(screen.getByLabelText("Transaction hash"), { target: { value: ` ${TX} ` } });
    fireEvent.click(screen.getByRole("button", { name: "Load" }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(`/event-timeline?tx=${TX}`));
  });
});
