import { act, renderHook } from "@testing-library/react"
import { useWebSocket, type SorobanEvent } from "../useWebSocket"

class MockWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  static instances: MockWebSocket[] = []

  readyState = MockWebSocket.CONNECTING
  onopen: ((this: WebSocket, event: Event) => unknown) | null = null
  onmessage: ((this: WebSocket, event: MessageEvent) => unknown) | null = null
  onclose: ((this: WebSocket, event: CloseEvent) => unknown) | null = null
  onerror: ((this: WebSocket, event: Event) => unknown) | null = null
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED
  })

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this)
  }

  open() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.call(this as unknown as WebSocket, new Event("open"))
  }

  sendMessage(data: string) {
    this.onmessage?.call(
      this as unknown as WebSocket,
      new MessageEvent("message", { data }),
    )
  }

  closeConnection(wasClean: boolean) {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.call(
      this as unknown as WebSocket,
      new CloseEvent("close", { wasClean }),
    )
  }

  error() {
    this.onerror?.call(this as unknown as WebSocket, new Event("error"))
  }
}

const originalWebSocket = global.WebSocket

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve()
  })
}

describe("useWebSocket", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    MockWebSocket.instances = []
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
    global.WebSocket = originalWebSocket
  })

  it("transitions through connecting, connected, error, and disconnected states", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {})
    const { result } = renderHook(() => useWebSocket("C123"))
    const socket = MockWebSocket.instances[0]

    await flushMicrotasks()
    expect(result.current.status).toBe("CONNECTING")
    expect(result.current.isConnected).toBe(false)
    expect(socket.url).toContain("/ws/events/C123/")

    act(() => socket.open())
    expect(result.current.status).toBe("CONNECTED")
    expect(result.current.isConnected).toBe(true)

    act(() => socket.error())
    expect(result.current.status).toBe("ERROR")
    expect(warn).toHaveBeenCalled()

    act(() => socket.closeConnection(true))
    expect(result.current.status).toBe("DISCONNECTED")
    expect(result.current.isConnected).toBe(false)
  })

  it("adds valid messages to events and ignores invalid JSON", async () => {
    const parseError = jest.spyOn(console, "error").mockImplementation(() => {})
    const { result } = renderHook(() => useWebSocket("C123"))
    const socket = MockWebSocket.instances[0]
    const event: SorobanEvent = {
      id: "event-1",
      ts: "2026-01-01T00:00:00Z",
      contract: "C123",
      type: "transfer",
      data: { amount: "12" },
      status: "PROCESSED",
    }

    await flushMicrotasks()
    act(() => socket.sendMessage(JSON.stringify(event)))
    expect(result.current.events).toEqual([event])

    act(() => socket.sendMessage("{invalid json"))
    expect(result.current.events).toEqual([event])
    expect(parseError).toHaveBeenCalledWith(
      "Failed to parse WebSocket message:",
      expect.any(SyntaxError),
    )

    act(() => result.current.clearEvents())
    expect(result.current.events).toEqual([])
  })

  it("reconnects five seconds after an unclean close", async () => {
    const { result } = renderHook(() => useWebSocket("C123"))
    const socket = MockWebSocket.instances[0]

    await flushMicrotasks()
    act(() => socket.closeConnection(false))
    expect(result.current.status).toBe("DISCONNECTED")

    act(() => jest.advanceTimersByTime(4999))
    expect(MockWebSocket.instances).toHaveLength(1)

    await act(async () => {
      jest.advanceTimersByTime(1)
      await Promise.resolve()
    })
    expect(MockWebSocket.instances).toHaveLength(2)
    expect(result.current.status).toBe("CONNECTING")
  })

  it("does not reconnect after a clean close", async () => {
    const { result } = renderHook(() => useWebSocket("C123"))

    await flushMicrotasks()
    act(() => MockWebSocket.instances[0].closeConnection(true))
    act(() => jest.advanceTimersByTime(5000))

    expect(result.current.status).toBe("DISCONNECTED")
    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it("closes the socket and clears a pending reconnect timer on unmount", async () => {
    const { unmount } = renderHook(() => useWebSocket("C123"))
    const socket = MockWebSocket.instances[0]

    await flushMicrotasks()
    act(() => socket.closeConnection(false))

    act(() => unmount())
    expect(socket.close).toHaveBeenCalledTimes(1)

    act(() => jest.advanceTimersByTime(5000))
    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it("connects again when contractId changes", async () => {
    const { rerender } = renderHook(
      ({ contractId }: { contractId: string }) => useWebSocket(contractId),
      { initialProps: { contractId: "C123" } },
    )

    await flushMicrotasks()
    const firstSocket = MockWebSocket.instances[0]

    rerender({ contractId: "C456" })
    await flushMicrotasks()

    expect(firstSocket.close).toHaveBeenCalledTimes(1)
    expect(MockWebSocket.instances).toHaveLength(2)
    expect(MockWebSocket.instances[1].url).toContain("/ws/events/C456/")
  })

  it("reconnects when reconnect is called after the socket closes", async () => {
    const { result } = renderHook(() => useWebSocket("C123"))
    const socket = MockWebSocket.instances[0]

    await flushMicrotasks()
    act(() => socket.closeConnection(true))

    act(() => result.current.reconnect())
    await flushMicrotasks()

    expect(MockWebSocket.instances).toHaveLength(2)
    expect(result.current.status).toBe("CONNECTING")
  })
})
