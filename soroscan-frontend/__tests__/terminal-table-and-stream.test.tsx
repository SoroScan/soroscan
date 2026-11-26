import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import {
  ResponsiveTable,
  type ColumnDefinition,
} from "@/components/terminal/ResponsiveTable"
import { LiveEventStream } from "@/components/terminal/LiveEventStream"
import {
  useWebSocket,
  type SorobanEvent,
  type ConnectionStatus,
} from "@/src/hooks/useWebSocket"

jest.mock("@/src/hooks/useWebSocket", () => {
  const actual = jest.requireActual("@/src/hooks/useWebSocket")
  return {
    ...actual,
    useWebSocket: jest.fn(),
  }
})

const mockUseWebSocket = useWebSocket as jest.MockedFunction<
  typeof useWebSocket
>

interface SampleRow {
  id: string
  contract: string
  eventType: string
  amount: number
  optionalNote?: string
}

const SAMPLE_ROWS: SampleRow[] = [
  {
    id: "evt-1",
    contract: "CAAA1111",
    eventType: "SWAP",
    amount: 250,
    optionalNote: "Pool A",
  },
  {
    id: "evt-2",
    contract: "CBBB2222",
    eventType: "TRANSFER",
    amount: 1000,
    optionalNote: "",
  },
]

const SAMPLE_COLUMNS: ColumnDefinition<SampleRow>[] = [
  {
    key: "contract",
    label: "Contract",
    sortable: true,
  },
  {
    key: "eventType",
    label: "Event Type",
    sortable: true,
  },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    render: (_item, value) => (
      <span data-testid="formatted-amount">${String(value)}</span>
    ),
  },
  {
    key: "optionalNote",
    label: "Note",
  },
]

describe("ResponsiveTable", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders table headers, rows, caption, and custom cell renderers", () => {
    render(
      <ResponsiveTable
        data={SAMPLE_ROWS}
        columns={SAMPLE_COLUMNS}
        caption="Contract events table"
      />
    )

    expect(screen.getByText("Contract events table")).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: /Contract/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: /Event Type/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("columnheader", { name: /Amount/i })
    ).toBeInTheDocument()

    // Desktop + mobile views both render row values
    expect(screen.getAllByText("CAAA1111").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("CBBB2222").length).toBeGreaterThanOrEqual(2)

    // Custom cell renderer output
    expect(screen.getAllByText("$250").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("$1000").length).toBeGreaterThanOrEqual(2)

    // Empty string values are omitted from mobile cards
    expect(screen.getAllByText("Note:")).toHaveLength(1)
  })

  it("renders default and custom empty states when data is empty", () => {
    const { rerender } = render(
      <ResponsiveTable data={[]} columns={SAMPLE_COLUMNS} />
    )

    expect(screen.getByText("No data available")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()

    rerender(
      <ResponsiveTable
        data={[]}
        columns={SAMPLE_COLUMNS}
        emptyMessage="No matching ledger events"
      />
    )

    expect(screen.getByText("No matching ledger events")).toBeInTheDocument()
  })

  it("renders loading skeletons when loading is true", () => {
    const { container } = render(
      <ResponsiveTable data={SAMPLE_ROWS} columns={SAMPLE_COLUMNS} loading />
    )

    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByText("CAAA1111")).not.toBeInTheDocument()
    expect(container.querySelector(".hidden.md\\:block")).toBeInTheDocument()
    expect(container.querySelector(".md\\:hidden")).toBeInTheDocument()
  })

  it("triggers onSortChange on click and keyboard Enter/Space for sortable columns", () => {
    const onSortChange = jest.fn()

    const { rerender } = render(
      <ResponsiveTable
        data={SAMPLE_ROWS}
        columns={SAMPLE_COLUMNS}
        sort={{ key: "contract", direction: "asc" }}
        onSortChange={onSortChange}
      />
    )

    const contractHeader = screen.getByRole("columnheader", {
      name: /Contract/i,
    })
    expect(contractHeader).toHaveAttribute("aria-sort", "ascending")

    // Clicking active ascending column toggles to descending
    fireEvent.click(contractHeader)
    expect(onSortChange).toHaveBeenCalledWith("contract", "desc")

    // Pressing Enter on another sortable column triggers ascending sort
    const amountHeader = screen.getByRole("columnheader", { name: /Amount/i })
    expect(amountHeader).toHaveAttribute("aria-sort", "none")
    fireEvent.keyDown(amountHeader, { key: "Enter" })
    expect(onSortChange).toHaveBeenCalledWith("amount", "asc")

    // Pressing Space also triggers sort
    fireEvent.keyDown(amountHeader, { key: " " })
    expect(onSortChange).toHaveBeenCalledTimes(3)

    // Non-sortable column does not emit sort changes
    const noteHeader = screen.getByRole("columnheader", { name: /Note/i })
    expect(noteHeader).not.toHaveAttribute("aria-sort")
    fireEvent.click(noteHeader)
    expect(onSortChange).toHaveBeenCalledTimes(3)

    rerender(
      <ResponsiveTable
        data={SAMPLE_ROWS}
        columns={SAMPLE_COLUMNS}
        sort={{ key: "contract", direction: "desc" }}
        onSortChange={onSortChange}
      />
    )
    expect(contractHeader).toHaveAttribute("aria-sort", "descending")
  })

  it("exposes desktop table and mobile card containers compatible with matchMedia breakpoints", () => {
    const matchMediaMock = window.matchMedia as jest.Mock

    // Simulate mobile viewport (<768px)
    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    expect(window.matchMedia("(min-width: 768px)").matches).toBe(false)

    const { container, rerender } = render(
      <ResponsiveTable data={SAMPLE_ROWS} columns={SAMPLE_COLUMNS} />
    )

    const desktopContainer = container.querySelector(".hidden.md\\:block")
    const mobileContainer = container.querySelector(".md\\:hidden")
    expect(desktopContainer).toBeInTheDocument()
    expect(mobileContainer).toBeInTheDocument()
    expect(mobileContainer?.children).toHaveLength(SAMPLE_ROWS.length)

    // Simulate desktop viewport (>=768px)
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === "(min-width: 768px)",
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    expect(window.matchMedia("(min-width: 768px)").matches).toBe(true)

    rerender(<ResponsiveTable data={SAMPLE_ROWS} columns={SAMPLE_COLUMNS} />)
    expect(screen.getByRole("table")).toBeInTheDocument()
  })
})

describe("LiveEventStream", () => {
  const makeEvent = (index: number, overrides: Partial<SorobanEvent> = {}): SorobanEvent => ({
    id: `ev-${index}`,
    ts: "2026-06-15T12:00:00.000Z",
    contract: "CABC123456789X4Z",
    type: index % 2 === 0 ? "SWAP_COMPLETE" : "TOKEN_MINT",
    data: { index, amount: index * 10 },
    status: "PROCESSED",
    ...overrides,
  })

  const setHookState = (
    events: SorobanEvent[],
    status: ConnectionStatus = "CONNECTED",
    reconnect = jest.fn()
  ) => {
    mockUseWebSocket.mockReturnValue({
      events,
      status,
      isConnected: status === "CONNECTED",
      reconnect,
      clearEvents: jest.fn(),
    })
    return reconnect
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("shows connecting state and reconnect action when establishing connection", () => {
    const reconnect = setHookState([], "CONNECTING")

    render(<LiveEventStream contractId="CABC123456789X4Z" />)

    expect(screen.getByText("LIVE_EVENT_STREAM")).toBeInTheDocument()
    expect(screen.getByText("CONNECTING")).toBeInTheDocument()
    expect(screen.getByText("ESTABLISHING_CONNECTION...")).toBeInTheDocument()

    const reconnectButton = screen.getByRole("button", { name: "RECONNECT" })
    fireEvent.click(reconnectButton)
    expect(reconnect).toHaveBeenCalledTimes(1)
  })

  it("shows empty streaming state when connected with no events and hides RECONNECT", () => {
    setHookState([], "CONNECTED")

    render(<LiveEventStream contractId="CABC123456789X4Z" />)

    expect(screen.getByText("CONNECTED")).toBeInTheDocument()
    expect(screen.getByText("NO_EVENTS_STREAMING")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "RECONNECT" })
    ).not.toBeInTheDocument()
    expect(screen.getByText("SYS_BUF_OK: 0/100")).toBeInTheDocument()
  })

  it("renders events and appends newly arriving events", () => {
    const firstEvent = makeEvent(1, { type: "SWAP_COMPLETE" })
    setHookState([firstEvent], "CONNECTED")

    const { rerender } = render(
      <LiveEventStream contractId="CABC123456789X4Z" />
    )

    expect(screen.getByText("SWAP_COMPLETE")).toBeInTheDocument()
    expect(screen.getByText("CABC...9X4Z")).toBeInTheDocument()
    expect(screen.getByText("SYS_BUF_OK: 1/100")).toBeInTheDocument()

    const secondEvent = makeEvent(2, {
      type: "LIQUIDITY_ADD",
      contract: "CDEF987654321W9Y",
    })
    setHookState([secondEvent, firstEvent], "CONNECTED")

    rerender(<LiveEventStream contractId="CABC123456789X4Z" />)

    expect(screen.getByText("LIQUIDITY_ADD")).toBeInTheDocument()
    expect(screen.getByText("CDEF...1W9Y")).toBeInTheDocument()
    expect(screen.getByText("SYS_BUF_OK: 2/100")).toBeInTheDocument()
    expect(
      screen.getByText("SHOWING 2 OF 2 BUFF_EVENTS")
    ).toBeInTheDocument()
  })

  it("filters rendered events by type or contract ID", () => {
    const events = [
      makeEvent(1, { type: "SWAP_COMPLETE", contract: "CAAA111122223333" }),
      makeEvent(2, { type: "TOKEN_BURN", contract: "CBBB444455556666" }),
    ]
    setHookState(events, "CONNECTED")

    render(<LiveEventStream contractId="CABC123456789X4Z" />)

    const filterInput = screen.getByPlaceholderText(
      "FILTER_BY_TYPE_OR_CONTRACT..."
    )
    fireEvent.change(filterInput, { target: { value: "burn" } })

    expect(screen.getByText("TOKEN_BURN")).toBeInTheDocument()
    expect(screen.queryByText("SWAP_COMPLETE")).not.toBeInTheDocument()
    expect(
      screen.getByText("SHOWING 1 OF 2 BUFF_EVENTS")
    ).toBeInTheDocument()
  })

  it("pauses updates, tracks buffered event count (including 99+ cap), and flushes on resume", () => {
    const initialEvents = [makeEvent(1, { type: "INITIAL_EVENT" })]
    setHookState(initialEvents, "CONNECTED")

    const { rerender } = render(
      <LiveEventStream contractId="CABC123456789X4Z" />
    )

    fireEvent.click(screen.getByRole("button", { name: /PAUSE/i }))
    expect(screen.getByText("[PAUSED]")).toBeInTheDocument()

    // 2 new events arrive while paused -> badge shows "2"
    const pausedBatch = [
      makeEvent(3, { type: "NEW_EVENT_3" }),
      makeEvent(2, { type: "NEW_EVENT_2" }),
      ...initialEvents,
    ]
    setHookState(pausedBatch, "CONNECTED")
    rerender(<LiveEventStream contractId="CABC123456789X4Z" />)

    expect(screen.queryByText("NEW_EVENT_3")).not.toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()

    // Over 100 events arrive pushing ev-1 out of buffer -> badge shows "99+"
    const overflowBatch = Array.from({ length: 100 }, (_, i) =>
      makeEvent(200 - i, { type: `OVERFLOW_${200 - i}` })
    )
    setHookState(overflowBatch, "CONNECTED")
    rerender(<LiveEventStream contractId="CABC123456789X4Z" />)

    expect(screen.getByText("99+")).toBeInTheDocument()

    // Resuming flushes buffered events into view
    fireEvent.click(screen.getByRole("button", { name: /RESUME/i }))
    expect(screen.queryByText("[PAUSED]")).not.toBeInTheDocument()
    expect(screen.getByText("OVERFLOW_200")).toBeInTheDocument()
  })

  it("copies event JSON payload to clipboard when Copy Data is clicked", () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText },
    })

    const event = makeEvent(1, { data: { token: "XLM", amount: "42" } })
    setHookState([event], "CONNECTED")

    render(<LiveEventStream contractId="CABC123456789X4Z" />)

    fireEvent.click(screen.getByTitle("Copy Data"))
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify({ token: "XLM", amount: "42" }, null, 2)
    )
  })

  it("enforces the 100-event max buffer length when streaming via WebSocket", async () => {
    const actualHook = jest.requireActual(
      "@/src/hooks/useWebSocket"
    ) as typeof import("@/src/hooks/useWebSocket")
    mockUseWebSocket.mockImplementation(actualHook.useWebSocket)

    class MockWebSocket {
      static OPEN = 1
      static instances: MockWebSocket[] = []
      readyState = MockWebSocket.OPEN
      url: string
      onopen: (() => void) | null = null
      onmessage: ((event: { data: string }) => void) | null = null
      onclose: ((event: { wasClean: boolean }) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      close = jest.fn()

      constructor(url: string) {
        this.url = url
        MockWebSocket.instances.push(this)
      }
    }

    const originalWebSocket = global.WebSocket
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket

    try {
      render(<LiveEventStream contractId="CABC123456789X4Z" />)

      await act(async () => {
        await Promise.resolve()
      })

      expect(MockWebSocket.instances).toHaveLength(1)
      const socket = MockWebSocket.instances[0]
      expect(socket.url).toContain("/ws/events/CABC123456789X4Z/")

      act(() => {
        socket.onopen?.()
      })
      expect(screen.getByText("CONNECTED")).toBeInTheDocument()

      // Emit 105 events over WebSocket; buffer must cap at 100
      act(() => {
        for (let i = 1; i <= 105; i++) {
          socket.onmessage?.({
            data: JSON.stringify(
              makeEvent(i, { type: `WS_EVENT_${i}` })
            ),
          })
        }
      })

      expect(screen.getByText("SYS_BUF_OK: 100/100")).toBeInTheDocument()
      expect(screen.getByText("WS_EVENT_105")).toBeInTheDocument()
      expect(screen.queryByText("WS_EVENT_1")).not.toBeInTheDocument()
    } finally {
      global.WebSocket = originalWebSocket
    }
  })
})