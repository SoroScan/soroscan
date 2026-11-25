import { act, fireEvent, render, screen } from "@testing-library/react";
import LiveStreamingPage from "@/app/live/page";
import { isValidContractId, toBadgeStatus, toStreamEvent } from "@/lib/live-stream";

const CONTRACT = `C${"A".repeat(55)}`;
let mockSearch = "";
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

/** Minimal controllable stand-in for the browser WebSocket. */
class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { wasClean: boolean }) => void) | null = null;
  onerror: ((event: { type: string }) => void) | null = null;
  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }
  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
  receive(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  drop() {
    this.readyState = 3;
    this.onclose?.({ wasClean: false });
  }
  close() {
    this.readyState = 3;
    this.onclose?.({ wasClean: true });
  }
}

const latest = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
const event = (n: number, eventType = "transfer") => ({
  contract_id: CONTRACT,
  event_type: eventType,
  payload: { amount: n },
  ledger: 1000 + n,
  event_index: 0,
  tx_hash: `${n}`.padStart(64, "0"),
});

/** Let the hook's microtask (CONNECTING) settle. */
const flush = () => act(async () => {});

beforeEach(() => {
  mockSearch = "";
  mockReplace.mockReset();
  FakeWebSocket.instances = [];
  (global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("live stream helpers", () => {
  it("validates contract IDs", () => {
    expect(isValidContractId(CONTRACT)).toBe(true);
    expect(isValidContractId("CA3D525C2...77A2")).toBe(false);
  });

  it("normalizes backend and legacy message shapes", () => {
    expect(toStreamEvent({ ...event(1), received_at: "2026-11-01T00:00:00.000Z" })).toEqual({
      id: `${"1".padStart(64, "0")}:0`,
      contractId: CONTRACT,
      eventType: "transfer",
      timestamp: "2026-11-01T00:00:00.000Z",
      ledgerSequence: 1001,
      txHash: "1".padStart(64, "0"),
      topics: ["transfer"],
      payload: { amount: 1 },
    });
    expect(toStreamEvent({ id: "e1", contract: CONTRACT, type: "mint", ts: "2026-01-01T00:00:00Z", data: { a: 1 } }))
      .toMatchObject({ id: "e1", eventType: "mint", timestamp: "2026-01-01T00:00:00Z", payload: { a: 1 } });
  });

  it("maps socket status to the badge", () => {
    expect(toBadgeStatus("CONNECTED")).toBe("connected");
    expect(toBadgeStatus("CONNECTING")).toBe("reconnecting");
    expect(toBadgeStatus("DISCONNECTED")).toBe("offline");
    expect(toBadgeStatus("ERROR")).toBe("offline");
  });
});

describe("LiveStreamingPage", () => {
  it("does not connect or show events without a contract", () => {
    render(<LiveStreamingPage />);
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(screen.getByText("Enter a contract ID to start streaming its events.")).toBeInTheDocument();
  });

  it("does not connect for an incomplete contract ID", () => {
    render(<LiveStreamingPage />);
    fireEvent.change(screen.getByLabelText("Contract ID"), { target: { value: "CA3D" } });
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a full contract ID");
  });

  it("connects for the contract and shows the empty connected state", async () => {
    mockSearch = `contract=${CONTRACT}`;
    render(<LiveStreamingPage />);
    await flush();
    expect(latest().url).toBe(`ws://localhost:8000/ws/events/${CONTRACT}/`);
    expect(screen.getByText("Connecting to the event stream...")).toBeInTheDocument();
    act(() => latest().open());
    expect(screen.getByText("Connected. Waiting for events...")).toBeInTheDocument();
    expect(screen.getByLabelText(/Connection status: Connected/)).toBeInTheDocument();
  });

  it("renders received events, oldest first", async () => {
    mockSearch = `contract=${CONTRACT}`;
    render(<LiveStreamingPage />);
    await flush();
    act(() => {
      latest().open();
      latest().receive(event(1, "transfer"));
      latest().receive(event(2, "mint"));
    });
    const ledgers = screen.getAllByText(/Ledger #/).map((el) => el.textContent);
    expect(ledgers).toEqual(["Ledger #1001", "Ledger #1002"]);
    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 2 / 2 events");
  });

  it("freezes the view while paused and catches up on resume", async () => {
    mockSearch = `contract=${CONTRACT}`;
    render(<LiveStreamingPage />);
    await flush();
    act(() => {
      latest().open();
      latest().receive(event(1));
    });
    fireEvent.click(screen.getByRole("button", { name: /Pause Stream/ }));
    act(() => latest().receive(event(2)));
    expect(screen.getAllByText(/Ledger #/)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Resume Stream/ }));
    expect(screen.getAllByText(/Ledger #/)).toHaveLength(2);
  });

  it("shows the disconnected state and reconnects", async () => {
    jest.useFakeTimers();
    mockSearch = `contract=${CONTRACT}`;
    render(<LiveStreamingPage />);
    await flush();
    act(() => latest().open());
    act(() => latest().drop());
    expect(screen.getByLabelText(/Connection status: Offline/)).toBeInTheDocument();
    expect(screen.getByText("Not connected to the event stream.")).toBeInTheDocument();

    // The hook retries an unclean close after 5 seconds.
    act(() => jest.advanceTimersByTime(5000));
    await flush();
    expect(FakeWebSocket.instances).toHaveLength(2);
    act(() => latest().open());
    expect(screen.getByLabelText(/Connection status: Connected/)).toBeInTheDocument();
  });

  it("filters by event type", async () => {
    mockSearch = `contract=${CONTRACT}`;
    render(<LiveStreamingPage />);
    await flush();
    act(() => {
      latest().open();
      latest().receive(event(1, "transfer"));
      latest().receive(event(2, "mint"));
    });
    fireEvent.change(screen.getByDisplayValue("All Event Types"), { target: { value: "mint" } });
    expect(screen.getAllByText(/Ledger #/).map((el) => el.textContent)).toEqual(["Ledger #1002"]);
  });
});
