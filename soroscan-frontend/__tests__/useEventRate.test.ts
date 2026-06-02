import { renderHook, waitFor, act } from "@testing-library/react";
import { useEventRate, useCalculatedEventRate } from "../components/metrics/useEventRate";

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate opening
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.(new Event("open"));
    }, 0);
  }

  send(data: string) {
    // Mock implementation
  }

  close() {
    this.readyState = 3;
    this.onclose?.(new CloseEvent("close"));
  }

  static sendMessage(instance: number, data: unknown) {
    const ws = MockWebSocket.instances[instance];
    if (ws?.onmessage) {
      ws.onmessage(
        new MessageEvent("message", {
          data: JSON.stringify(data),
        })
      );
    }
  }

  static reset() {
    MockWebSocket.instances = [];
  }
}

// @ts-ignore
global.WebSocket = MockWebSocket;

describe("useEventRate Hook", () => {
  beforeEach(() => {
    MockWebSocket.reset();
  });

  it("initializes with rate of 0", () => {
    const { result } = renderHook(() => useEventRate("test-contract"));

    expect(result.current.rate).toBe(0);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("connects to WebSocket on mount", async () => {
    renderHook(() => useEventRate("test-contract"));

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(0);
    });

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toContain("test-contract");
  });

  it("updates isConnected on successful connection", async () => {
    const { result } = renderHook(() => useEventRate("test-contract"));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it("updates rate when receiving event message", async () => {
    const { result } = renderHook(() => useEventRate("test-contract"));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      MockWebSocket.sendMessage(0, {
        type: "event",
        data: { test: "data" },
      });
    });

    // Rate should increment after event
    await waitFor(() => {
      expect(result.current.rate).toBeGreaterThan(0);
    });
  });

  it("updates rate when receiving rate_update message", async () => {
    const { result } = renderHook(() => useEventRate("test-contract"));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      MockWebSocket.sendMessage(0, {
        type: "rate_update",
        rate: 42.5,
      });
    });

    await waitFor(() => {
      expect(result.current.rate).toBe(42.5);
    });
  });

  it("handles WebSocket errors gracefully", async () => {
    const { result } = renderHook(() => useEventRate("test-contract"));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      const ws = MockWebSocket.instances[0];
      ws.onerror?.(new Event("error"));
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  it("ignores malformed JSON messages", async () => {
    const { result } = renderHook(() => useEventRate("test-contract"));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const ws = MockWebSocket.instances[0];
    // Directly invoke onmessage with invalid JSON
    ws.onmessage?.(
      new MessageEvent("message", {
        data: "not valid json",
      })
    );

    // Should not crash, rate should remain 0
    expect(result.current.rate).toBe(0);
  });

  it("cleans up WebSocket on unmount", async () => {
    const { unmount } = renderHook(() => useEventRate("test-contract"));

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1);
    });

    const ws = MockWebSocket.instances[0];
    const closeSpy = jest.spyOn(ws, "close");

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });
});

describe("useCalculatedEventRate Hook", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calculates rate from timestamps", () => {
    const now = Date.now();
    const events = [now, now - 500, now - 1000, now - 1500, now - 2000];

    const { result } = renderHook(() =>
      useCalculatedEventRate(events, 5)
    );

    // 5 events in 5 seconds = 1 event/second
    expect(result.current).toBe(1);
  });

  it("filters out events outside the window", () => {
    const now = Date.now();
    const events = [
      now,
      now - 1000,
      now - 2000,
      now - 10000, // Outside 5-second window
    ];

    const { result } = renderHook(() =>
      useCalculatedEventRate(events, 5)
    );

    // 3 events in 5-second window = 0.6 events/second
    expect(result.current).toBeCloseTo(0.6, 1);
  });

  it("returns 0 when no events", () => {
    const { result } = renderHook(() =>
      useCalculatedEventRate([], 5)
    );

    expect(result.current).toBe(0);
  });

  it("updates rate when events list changes", () => {
    const now = Date.now();
    const { result, rerender } = renderHook(
      ({ events, window }) =>
        useCalculatedEventRate(events, window),
      {
        initialProps: {
          events: [now, now - 1000],
          window: 5,
        },
      }
    );

    expect(result.current).toBeCloseTo(0.4, 1);

    // Add more events
    rerender({
      events: [now, now - 500, now - 1000, now - 1500],
      window: 5,
    });

    expect(result.current).toBeCloseTo(0.8, 1);
  });

  it("supports custom window sizes", () => {
    const now = Date.now();
    const events = Array.from({ length: 10 }).map((_, i) => now - i * 500);

    const { result: result5 } = renderHook(() =>
      useCalculatedEventRate(events, 5)
    );

    const { result: result10 } = renderHook(() =>
      useCalculatedEventRate(events, 10)
    );

    // 5-second window should have higher rate than 10-second window
    expect(result5.current).toBeGreaterThan(result10.current);
  });
});
