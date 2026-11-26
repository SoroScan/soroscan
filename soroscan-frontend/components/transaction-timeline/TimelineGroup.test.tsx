import { fireEvent, render, screen, within } from "@testing-library/react";
import { TimelineEvent } from "./TimelineEvent";
import { TimelineGroup } from "./TimelineGroup";
import type {
  TimelineZoomLevel,
  TransactionTimelineEvent,
  TransactionTimelineGroupData,
} from "./types";

function makeEvent(
  overrides: Partial<TransactionTimelineEvent> = {},
): TransactionTimelineEvent {
  return {
    id: "event-1",
    transactionId: "tx-123",
    eventType: "Transfer",
    title: "Funds transferred",
    timestamp: "2026-03-22T10:01:00.000Z",
    status: "success",
    contractId: "contract-abc",
    txHash: "a".repeat(128),
    ledger: 42,
    parentEventId: null,
    details: { amount: 25 },
    ...overrides,
  };
}

function makeGroup(
  events: TransactionTimelineEvent[],
): TransactionTimelineGroupData {
  return {
    transactionId: "tx-123",
    startedAt: "2026-03-22T10:01:00.000Z",
    completedAt: "2026-03-22T10:03:00.000Z",
    events,
  };
}

describe("TimelineEvent", () => {
  const onToggle = jest.fn();
  const zoom: TimelineZoomLevel = "normal";

  beforeEach(() => {
    onToggle.mockClear();
  });

  it("renders event title, status, timestamp, type, and event identifier", () => {
    render(
      <TimelineEvent
        event={makeEvent({ status: "error" })}
        expanded={false}
        isLast
        zoom={zoom}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByTestId("timeline-event")).toHaveAttribute(
      "data-status",
      "error",
    );
    expect(screen.getByTestId("timeline-event-title")).toHaveTextContent(
      "Funds transferred",
    );
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText(/Transfer$/)).toBeInTheDocument();
    expect(screen.getByText("event-1")).toBeInTheDocument();
  });

  it("toggles through its callback and renders expanded transaction details", () => {
    const event = makeEvent({
      details: { amount: 25, recipient: "GDESTINATION" },
    });
    const { rerender } = render(
      <TimelineEvent
        event={event}
        expanded={false}
        isLast={false}
        zoom={zoom}
        onToggle={onToggle}
      />,
    );

    const toggle = screen.getByRole("button", { name: /Funds transferred/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <TimelineEvent
        event={event}
        expanded
        isLast={false}
        zoom={zoom}
        onToggle={onToggle}
      />,
    );

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/"recipient": "GDESTINATION"/),
    ).toBeInTheDocument();
    expect(screen.getByText("contract-abc")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("preserves long transaction hashes and shows fallbacks for missing details", () => {
    const longHash = "G".repeat(128);
    const event = makeEvent({
      contractId: undefined,
      txHash: longHash,
      ledger: undefined,
    });

    render(
      <TimelineEvent
        event={event}
        expanded
        isLast
        zoom={zoom}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByText(longHash)).toBeInTheDocument();
    expect(screen.getAllByText("Not provided")).toHaveLength(2);
  });
});

describe("TimelineGroup", () => {
  const onToggleEvent = jest.fn();

  beforeEach(() => {
    onToggleEvent.mockClear();
  });

  it("renders events in group order, status totals, and event toggle state", () => {
    const events = [
      makeEvent({ id: "event-later", title: "Later event", status: "error" }),
      makeEvent({ id: "event-first", title: "First event", status: "success" }),
      makeEvent({ id: "event-pending", title: "Pending event", status: "pending" }),
    ];

    render(
      <TimelineGroup
        group={makeGroup(events)}
        expandedEventIds={new Set(["event-first"])}
        zoom="compact"
        onToggleEvent={onToggleEvent}
      />,
    );

    const eventList = screen.getByRole("list", { name: "Events in tx-123" });
    expect(
      within(eventList)
        .getAllByTestId("timeline-event-title")
        .map((title) => title.textContent),
    ).toEqual(["Later event", "First event", "Pending event"]);
    expect(screen.getByText("1 success")).toBeInTheDocument();
    expect(screen.getByText("1 error")).toBeInTheDocument();
    expect(screen.getByText("1 pending")).toBeInTheDocument();
    expect(
      within(eventList).getByRole("button", { name: /First event/ }),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(within(eventList).getByRole("button", { name: /Later event/ }));
    expect(onToggleEvent).toHaveBeenCalledWith("event-later");
  });

  it("renders transaction metadata and zero totals for an empty event group", () => {
    render(
      <TimelineGroup
        group={makeGroup([])}
        expandedEventIds={new Set()}
        zoom="normal"
        onToggleEvent={onToggleEvent}
      />,
    );

    expect(screen.getByRole("heading", { name: "tx-123" })).toBeInTheDocument();
    expect(screen.getByText("0 success")).toBeInTheDocument();
    expect(screen.getByText("0 error")).toBeInTheDocument();
    expect(screen.getByText("0 pending")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Events in tx-123" })).toBeEmptyDOMElement();
    expect(screen.queryByTestId("timeline-event")).not.toBeInTheDocument();
  });
});
