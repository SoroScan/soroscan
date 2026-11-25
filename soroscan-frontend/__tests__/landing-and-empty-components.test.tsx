import React from "react"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Activity } from "lucide-react"
import { MetricCard } from "@/src/components/cards/MetricCard"
import { EventStream } from "@/components/terminal/landing/EventStream"
import { ContractEmptyState } from "@/app/contracts/components/ContractEmptyState"

describe("MetricCard", () => {
  it("renders title, numeric/string value, subtitle, icon, and children", () => {
    render(
      <MetricCard
        title="Total Events"
        value="128,450"
        subtitle="Last 24 hours"
        icon={<Activity data-testid="metric-icon" />}
      >
        <p>Extra metric detail</p>
      </MetricCard>
    )

    expect(screen.getByText("Total Events")).toBeInTheDocument()
    expect(screen.getByText("128,450")).toBeInTheDocument()
    expect(screen.getByText("Last 24 hours")).toBeInTheDocument()
    expect(screen.getByTestId("metric-icon")).toBeInTheDocument()
    expect(screen.getByText("Extra metric detail")).toBeInTheDocument()
  })

  it("prefers subValue over subtitle when both are provided", () => {
    render(
      <MetricCard
        title="Active Contracts"
        value={42}
        subtitle="Fallback subtitle"
        subValue="Verified on mainnet"
      />
    )

    expect(screen.getByText("Verified on mainnet")).toBeInTheDocument()
    expect(screen.queryByText("Fallback subtitle")).not.toBeInTheDocument()
  })

  it("applies positive, negative, and neutral trend styling and omits change when undefined", () => {
    const { rerender } = render(
      <MetricCard
        title="Throughput"
        value="120/s"
        change="+14.2%"
        changeType="positive"
      />
    )

    const positiveChange = screen.getByText("+14.2%")
    expect(positiveChange.className).toContain("text-terminal-green")

    rerender(
      <MetricCard
        title="Throughput"
        value="95/s"
        change="-5.1%"
        changeType="negative"
      />
    )

    const negativeChange = screen.getByText("-5.1%")
    expect(negativeChange.className).toContain("text-terminal-danger")

    rerender(
      <MetricCard
        title="Throughput"
        value="100/s"
        change="0.0%"
        changeType="neutral"
      />
    )

    const neutralChange = screen.getByText("0.0%")
    expect(neutralChange.className).toContain("text-terminal-gray")

    rerender(<MetricCard title="Throughput" value="100/s" />)
    expect(screen.queryByText("0.0%")).not.toBeInTheDocument()
  })

  it("renders loading placeholder '---' when loading is true", () => {
    render(<MetricCard title="Indexed Ledgers" value={999999} loading />)

    expect(screen.getByText("---")).toBeInTheDocument()
    expect(screen.queryByText("999999")).not.toBeInTheDocument()
  })

  it("forwards custom className and extra HTML attributes to the root element", () => {
    render(
      <MetricCard
        title="Latency"
        value="45ms"
        className="custom-metric-class"
        id="latency-card"
        aria-label="Latency metric card"
      />
    )

    const card = screen.getByTestId("metric-card")
    expect(card).toHaveClass("custom-metric-class")
    expect(card).toHaveAttribute("id", "latency-card")
    expect(card).toHaveAttribute("aria-label", "Latency metric card")
  })
})

describe("EventStream (landing)", () => {
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

  let originalWebSocket: typeof WebSocket

  beforeEach(() => {
    jest.useFakeTimers()
    MockWebSocket.instances = []
    originalWebSocket = global.WebSocket
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
    global.WebSocket = originalWebSocket
  })

  it("renders problem/solution sections and live event stream rows for the featured contract", async () => {
    render(<EventStream />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText("[PROBLEM]")).toBeInTheDocument()
    expect(screen.getByText("NO_THE_GRAPH_FOR_SOROBAN")).toBeInTheDocument()
    expect(screen.getByText("[SOLUTION]")).toBeInTheDocument()
    expect(screen.getByText("SOROSCAN_IS_THE_FIX")).toBeInTheDocument()
    expect(screen.getByText("LIVE_EVENT_STREAM")).toBeInTheDocument()

    expect(MockWebSocket.instances).toHaveLength(1)
    const socket = MockWebSocket.instances[0]
    expect(socket.url).toContain(
      "/ws/events/CB76XYM3HDYCR2LZEM6BTXGWBZCH6D66Z6F7B/"
    )

    act(() => {
      socket.onopen?.()
      socket.onmessage?.({
        data: JSON.stringify({
          id: "landing-ev-1",
          ts: "2026-06-15T12:00:00.000Z",
          contract: "CB76XYM3HDYCR2LZEM6BTXGWBZCH6D66Z6F7B",
          type: "SWAP_EXECUTED",
          data: { pair: "XLM/USDC" },
          status: "PROCESSED",
        }),
      })
    })

    expect(screen.getByText("CONNECTED")).toBeInTheDocument()
    expect(screen.getByText("SWAP_EXECUTED")).toBeInTheDocument()
    expect(screen.getByText("CB76...6F7B")).toBeInTheDocument()
  })

  it("closes the socket and clears pending reconnect timers on unmount", async () => {
    const { unmount } = render(<EventStream />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(MockWebSocket.instances).toHaveLength(1)
    const socket = MockWebSocket.instances[0]

    // Simulate an unexpected disconnect which schedules a 5000ms reconnect timer
    act(() => {
      socket.onclose?.({ wasClean: false })
    })

    unmount()

    expect(socket.close).toHaveBeenCalledTimes(1)

    // Advancing past the 5000ms reconnect delay must not open a new socket after unmount
    act(() => {
      jest.advanceTimersByTime(6000)
    })

    expect(MockWebSocket.instances).toHaveLength(1)
  })
})

describe("ContractEmptyState", () => {
  it("renders empty state messaging, CLI hint, and register CTA button", () => {
    render(<ContractEmptyState onRegister={jest.fn()} />)

    expect(screen.getByText("No contracts found")).toBeInTheDocument()
    expect(
      screen.getByText(/You haven't registered any Soroban contracts yet\./i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Register a contract to start indexing events\./i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/\$ soroscan contracts register --id <CONTRACT_ID>/i)
    ).toBeInTheDocument()

    const registerButton = screen.getByRole("button", {
      name: /Register your first contract/i,
    })
    expect(registerButton).toBeInTheDocument()
    expect(registerButton).toHaveTextContent("Register Contract")
  })

  it("calls onRegister on click and is keyboard accessible via Tab and Enter", async () => {
    const user = userEvent.setup()
    const onRegister = jest.fn()

    render(<ContractEmptyState onRegister={onRegister} />)

    const registerButton = screen.getByRole("button", {
      name: /Register your first contract/i,
    })

    await user.tab()
    expect(registerButton).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(onRegister).toHaveBeenCalledTimes(1)

    await user.click(registerButton)
    expect(onRegister).toHaveBeenCalledTimes(2)
  })
})