import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import {
  LiveStreamingContent,
  initialEvents,
} from "@/app/live/page"

const mockReplace = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    prefetch: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}))

describe("Live Event Stream Connecting and Empty States (Issue #1711)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockSearchParams = new URLSearchParams()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("renders connecting state and badge on initial mount", () => {
    render(
      <LiveStreamingContent
        initialStatus="connecting"
        simulateAutoConnect={false}
      />
    )

    // Connecting container & indicators
    expect(screen.getByTestId("live-stream-connecting")).toBeInTheDocument()
    expect(screen.getByText("[CONNECTING_TO_STREAM]")).toBeInTheDocument()
    expect(
      screen.getByText(/Establishing WebSocket connection to Soroban real-time event feed/i)
    ).toBeInTheDocument()

    // Header badge
    expect(screen.getByTestId("status-badge-connecting")).toBeInTheDocument()
    expect(screen.getByText("CONNECTING")).toBeInTheDocument()

    // Pause/Resume button is disabled while connecting
    const streamActionBtn = screen.getByRole("button", { name: /Pause Stream/i })
    expect(streamActionBtn).toBeDisabled()
  })

  it("transitions from connecting to connected and renders events", () => {
    render(
      <LiveStreamingContent
        initialStatus="connecting"
        simulateAutoConnect={true}
      />
    )

    expect(screen.getByTestId("live-stream-connecting")).toBeInTheDocument()

    // Fast-forward past the connection timer
    act(() => {
      jest.advanceTimersByTime(800)
    })

    // Now connected
    expect(screen.queryByTestId("live-stream-connecting")).not.toBeInTheDocument()
    expect(screen.getByTestId("status-badge-live")).toBeInTheDocument()
    expect(screen.getByText("LIVE STREAMING")).toBeInTheDocument()
    expect(screen.getAllByText(/CA3D525C2\.\.\.77A2/).length).toBeGreaterThanOrEqual(1)
  })

  it("renders connected-with-no-events EmptyState when event list is empty", () => {
    render(
      <LiveStreamingContent
        initialStatus="connected"
        initialEventsList={[]}
        simulateAutoConnect={false}
      />
    )

    // Empty state container & copy
    expect(screen.getByTestId("live-stream-empty")).toBeInTheDocument()
    expect(screen.getByText("NO_EVENTS_YET")).toBeInTheDocument()
    expect(
      screen.getByText(/Connected to Soroban event stream\. Waiting for smart contract events/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/\[LISTENING\] Protocol 22\+ WebSocket feed active/i)).toBeInTheDocument()

    // Header reflects LIVE status
    expect(screen.getByTestId("status-badge-live")).toBeInTheDocument()
  })

  it("renders disconnected state with reconnect CTA and handles reconnect", () => {
    render(
      <LiveStreamingContent
        initialStatus="disconnected"
        initialEventsList={initialEvents}
        simulateAutoConnect={false}
      />
    )

    // Disconnected state
    expect(screen.getByTestId("live-stream-error")).toBeInTheDocument()
    expect(screen.getByText("STREAM_DISCONNECTED")).toBeInTheDocument()
    expect(
      screen.getByText(/Live event stream has been disconnected/i)
    ).toBeInTheDocument()
    expect(screen.getByTestId("status-badge-disconnected")).toBeInTheDocument()

    // Reconnect CTA button in empty state
    const reconnectBtn = screen.getByRole("button", { name: "RECONNECT" })
    expect(reconnectBtn).toBeInTheDocument()

    // Trigger reconnect
    fireEvent.click(reconnectBtn)

    // Immediately switches to connecting state
    expect(screen.getByTestId("live-stream-connecting")).toBeInTheDocument()
    expect(screen.getByTestId("status-badge-connecting")).toBeInTheDocument()

    // Advance reconnection timer
    act(() => {
      jest.advanceTimersByTime(800)
    })

    // Restores to connected with events
    expect(screen.queryByTestId("live-stream-connecting")).not.toBeInTheDocument()
    expect(screen.getByTestId("status-badge-live")).toBeInTheDocument()
  })

  it("renders stream connection error state", () => {
    render(
      <LiveStreamingContent
        initialStatus="error"
        initialEventsList={[]}
        simulateAutoConnect={false}
      />
    )

    expect(screen.getByTestId("live-stream-error")).toBeInTheDocument()
    expect(screen.getByText("STREAM_CONNECTION_ERROR")).toBeInTheDocument()
    expect(
      screen.getByText(/Failed to receive events from Soroban RPC WebSocket/i)
    ).toBeInTheDocument()
    expect(screen.getByText("ERROR")).toBeInTheDocument()
  })

  it("renders filter empty state when active filter matches 0 events and can clear filters", () => {
    render(
      <LiveStreamingContent
        initialStatus="connected"
        initialEventsList={initialEvents}
        simulateAutoConnect={false}
      />
    )

    const contractInput = screen.getByTestId("contract-filter-input") as HTMLInputElement
    fireEvent.change(contractInput, { target: { value: "NON_EXISTENT_CONTRACT" } })

    // Shows filter empty state
    expect(screen.getByTestId("live-stream-filter-empty")).toBeInTheDocument()
    expect(screen.getByText("NO_MATCHING_EVENTS")).toBeInTheDocument()
    expect(
      screen.getByText(/No streaming events match the active filter criteria/i)
    ).toBeInTheDocument()

    // Click CLEAR_FILTERS button inside empty state
    const clearBtn = screen.getByRole("button", { name: "CLEAR_FILTERS" })
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn)

    // Restores events
    expect(contractInput.value).toBe("")
    expect(screen.queryByTestId("live-stream-filter-empty")).not.toBeInTheDocument()
    expect(screen.getAllByText(/CA3D525C2\.\.\.77A2/).length).toBeGreaterThanOrEqual(1)
  })

  it("pauses and resumes stream with pause button", () => {
    render(
      <LiveStreamingContent
        initialStatus="connected"
        initialEventsList={initialEvents}
        simulateAutoConnect={false}
      />
    )

    const pauseBtn = screen.getByRole("button", { name: /Pause Stream/i })
    fireEvent.click(pauseBtn)

    expect(screen.getByTestId("status-badge-paused")).toBeInTheDocument()
    expect(screen.getByText("PAUSED")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Resume Stream/i })).toBeInTheDocument()
  })
})
