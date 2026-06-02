"use client";

import { useEffect, useState, useCallback } from "react";

interface EventRateData {
  rate: number;
  timestamp: number;
  totalEvents: number;
}

export function useEventRate(contractId: string) {
  const [rate, setRate] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (!contractId) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/events/${contractId}/`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Extract rate from different message types
          if (data.type === "event") {
            // Single event received - increment counter
            // In a real app, calculate based on event frequency
            setRate((prev) => prev + 1);

            // Reset after 1 second to simulate per-second rate
            setTimeout(() => {
              setRate((prev) => Math.max(0, prev - 1));
            }, 1000);
          } else if (data.type === "rate_update" && data.rate !== undefined) {
            // Direct rate update from server
            setRate(data.rate);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = (event) => {
        setError("WebSocket error occurred");
        setIsConnected(false);
        console.error("WebSocket error:", event);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          connect();
        }, 3000);
      };

      return () => {
        ws.close();
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection error";
      setError(message);
      setIsConnected(false);
    }
  }, [contractId]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connect]);

  return {
    rate,
    isConnected,
    error,
  };
}

/**
 * Calculate events per second from a stream of timestamps.
 * Useful for batched event processing.
 */
export function useCalculatedEventRate(events: number[], windowSeconds = 5) {
  const [rate, setRate] = useState(0);

  useEffect(() => {
    if (events.length === 0) {
      setRate(0);
      return;
    }

    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const recentEvents = events.filter((ts) => now - ts < windowMs);

    const calculatedRate = recentEvents.length / windowSeconds;
    setRate(calculatedRate);
  }, [events, windowSeconds]);

  return rate;
}
