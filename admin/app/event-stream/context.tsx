'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { StreamEvent, StreamFilters, Contract } from './types';
import { MAX_EVENTS } from './types';

const BASE_URL = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000';

interface EventStreamContextType {
  // Events
  events: StreamEvent[];
  clearEvents: () => void;

  // Stream state
  isConnected: boolean;
  isPaused: boolean;
  togglePause: () => void;

  // Filters
  filters: StreamFilters;
  setFilters: (f: Partial<StreamFilters>) => void;
  applyFilters: () => void;

  // Contracts list
  contracts: Contract[];

  // Auto-scroll
  autoScroll: boolean;
  setAutoScroll: (v: boolean) => void;

  // Fullscreen
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Copy
  copyEvent: (event: StreamEvent) => void;
  copiedId: string | null;
}

const EventStreamContext = createContext<EventStreamContextType | undefined>(undefined);

export function EventStreamProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial filters from URL
  const [filters, setFiltersState] = useState<StreamFilters>({
    contractId: searchParams.get('contract') ?? '',
    eventType: searchParams.get('event_type') ?? '',
    since: searchParams.get('since') ?? '',
    until: searchParams.get('until') ?? '',
  });

  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pauseBufferRef = useRef<StreamEvent[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch contracts for the filter dropdown
  useEffect(() => {
    fetch(`${BASE_URL}/api/ingest/contracts/?page_size=100`)
      .then((r) => r.json())
      .then((d) => setContracts(d.results ?? d))
      .catch(() => {});
  }, []);

  // Connect / reconnect WebSocket when contractId changes
  const connectWs = useCallback((contractId: string, eventType: string) => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (!contractId) {
      setIsConnected(false);
      return;
    }

    const qs = eventType ? `?event_type=${encodeURIComponent(eventType)}` : '';
    const ws = new WebSocket(`${WS_BASE}/ws/events/${contractId}/${qs}`);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const event: StreamEvent = {
          id: crypto.randomUUID(),
          event_id: data.id,
          contract_id: data.contract_id ?? contractId,
          event_type: data.event_type ?? '',
          payload: data.payload ?? {},
          ledger: data.ledger ?? 0,
          timestamp: data.timestamp ?? new Date().toISOString(),
          tx_hash: data.tx_hash ?? '',
        };

        if (isPaused) {
          pauseBufferRef.current.push(event);
        } else {
          setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
        }
      } catch {
        // ignore malformed messages
      }
    };
  }, [isPaused]);

  // Re-connect when filters.contractId or filters.eventType changes
  useEffect(() => {
    connectWs(filters.contractId, filters.eventType);
    return () => {
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.contractId, filters.eventType]);

  // Flush pause buffer on resume
  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      if (prev) {
        // resuming — flush buffer
        const buffered = pauseBufferRef.current;
        pauseBufferRef.current = [];
        if (buffered.length > 0) {
          setEvents((e) => [...buffered.reverse(), ...e].slice(0, MAX_EVENTS));
        }
      }
      return !prev;
    });
  }, []);

  // Keep isPaused in sync for the ws.onmessage closure
  useEffect(() => {
    if (!wsRef.current) return;
    wsRef.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const event: StreamEvent = {
          id: crypto.randomUUID(),
          event_id: data.id,
          contract_id: data.contract_id ?? filters.contractId,
          event_type: data.event_type ?? '',
          payload: data.payload ?? {},
          ledger: data.ledger ?? 0,
          timestamp: data.timestamp ?? new Date().toISOString(),
          tx_hash: data.tx_hash ?? '',
        };
        if (isPaused) {
          pauseBufferRef.current.push(event);
        } else {
          setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
        }
      } catch {}
    };
  }, [isPaused, filters.contractId]);

  const setFilters = useCallback((partial: Partial<StreamFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  // Push filters to URL
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.contractId) params.set('contract', filters.contractId);
    if (filters.eventType) params.set('event_type', filters.eventType);
    if (filters.since) params.set('since', filters.since);
    if (filters.until) params.set('until', filters.until);
    router.replace(`/event-stream?${params.toString()}`);
    setEvents([]);
    pauseBufferRef.current = [];
  }, [filters, router]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    pauseBufferRef.current = [];
  }, []);

  // Fullscreen API
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      }
      if (e.code === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePause]);

  const copyEvent = useCallback((event: StreamEvent) => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2)).then(() => {
      setCopiedId(event.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  return (
    <EventStreamContext.Provider
      value={{
        events,
        clearEvents,
        isConnected,
        isPaused,
        togglePause,
        filters,
        setFilters,
        applyFilters,
        contracts,
        autoScroll,
        setAutoScroll,
        isFullscreen,
        toggleFullscreen,
        containerRef,
        copyEvent,
        copiedId,
      }}
    >
      {children}
    </EventStreamContext.Provider>
  );
}

export function useEventStream() {
  const ctx = useContext(EventStreamContext);
  if (!ctx) throw new Error('useEventStream must be used within EventStreamProvider');
  return ctx;
}
