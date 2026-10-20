"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Filter,
  ArrowDownCircle,
  Terminal,
  Radio,
  X,
  WifiOff,
  RotateCcw,
} from "lucide-react";
import { EmptyState, EmptyStateIcon } from "@/components/ui/empty-state";

export type StreamConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface StreamEvent {
  id: string;
  contractId: string;
  eventType: string;
  timestamp: string;
  ledgerSequence: number;
  txHash: string;
  topics: string[];
  payload: Record<string, unknown>;
}

export const initialEvents: StreamEvent[] = [
  {
    id: "evt_1001",
    contractId: "CA3D525C2...77A2",
    eventType: "transfer",
    timestamp: new Date(Date.now() - 12000).toISOString(),
    ledgerSequence: 4982104,
    txHash: "0a1b2c3d4e5f...",
    topics: ["transfer", "from:GBX...", "to:GAY..."],
    payload: { amount: "50000000", asset: "USDC", from: "GBX...123", to: "GAY...456" },
  },
  {
    id: "evt_1002",
    contractId: "CB8E119A4...33F1",
    eventType: "swap",
    timestamp: new Date(Date.now() - 9000).toISOString(),
    ledgerSequence: 4982105,
    txHash: "9f8e7d6c5b4a...",
    topics: ["swap", "pool:XLM/USDC"],
    payload: { amountIn: "100.00 XLM", amountOut: "42.15 USDC", trader: "GCT...789" },
  },
  {
    id: "evt_1003",
    contractId: "CA3D525C2...77A2",
    eventType: "mint",
    timestamp: new Date(Date.now() - 5000).toISOString(),
    ledgerSequence: 4982106,
    txHash: "123456789abc...",
    topics: ["mint", "to:GCT...789"],
    payload: { amount: "1000000", recipient: "GCT...789" },
  },
];

export interface LiveStreamingContentProps {
  initialStatus?: StreamConnectionStatus;
  initialEventsList?: StreamEvent[];
  simulateAutoConnect?: boolean;
}

export function LiveStreamingContent({
  initialStatus,
  initialEventsList,
  simulateAutoConnect = true,
}: LiveStreamingContentProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read status override from searchParams if present
  const queryStatus = searchParams?.get("status") as StreamConnectionStatus | null;
  const initialResolvedStatus: StreamConnectionStatus =
    queryStatus && ["connecting", "connected", "disconnected", "error"].includes(queryStatus)
      ? queryStatus
      : initialStatus || "connecting";

  const [connectionStatus, setConnectionStatus] = useState<StreamConnectionStatus>(initialResolvedStatus);

  // Read events override: ?empty=true results in no events
  const isExplicitEmpty = searchParams?.get("empty") === "true";
  const [events, setEvents] = useState<StreamEvent[]>(() => {
    if (isExplicitEmpty) return [];
    return initialEventsList !== undefined ? initialEventsList : initialEvents;
  });

  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters read from URL params or state
  const [contractFilter, setContractFilter] = useState(searchParams?.get("contract") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams?.get("type") || "");
  const [dateFilter, setDateFilter] = useState(searchParams?.get("date") || "");

  const streamContainerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Simulate initial connection transition from connecting -> connected
  useEffect(() => {
    if (connectionStatus === "connecting" && simulateAutoConnect && !queryStatus) {
      const timer = setTimeout(() => {
        setConnectionStatus("connected");
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, simulateAutoConnect, queryStatus]);

  // Update URL params when filters change
  const updateUrlParams = useCallback(
    (contract: string, type: string, date: string) => {
      const params = new URLSearchParams();
      if (contract) params.set("contract", contract);
      if (type) params.set("type", type);
      if (date) params.set("date", date);

      const queryString = params.toString();
      router.replace(queryString ? `/live?${queryString}` : "/live", { scroll: false });
    },
    [router]
  );

  const handleContractChange = (val: string) => {
    setContractFilter(val);
    updateUrlParams(val, typeFilter, dateFilter);
  };

  const handleTypeChange = (val: string) => {
    setTypeFilter(val);
    updateUrlParams(contractFilter, val, dateFilter);
  };

  const handleDateChange = (val: string) => {
    setDateFilter(val);
    updateUrlParams(contractFilter, typeFilter, val);
  };

  const clearFilters = () => {
    setContractFilter("");
    setTypeFilter("");
    setDateFilter("");
    updateUrlParams("", "", "");
  };

  const handleReconnect = () => {
    setConnectionStatus("connecting");
    setTimeout(() => {
      setConnectionStatus("connected");
    }, 750);
  };

  // Simulate streaming events when connected and not paused
  useEffect(() => {
    if (connectionStatus !== "connected" || isPaused) return;

    const interval = setInterval(() => {
      const eventTypes = ["transfer", "swap", "mint", "deposit", "withdraw", "approve"];
      const contracts = ["CA3D525C2...77A2", "CB8E119A4...33F1", "CC99112F8...11AA"];
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const randomContract = contracts[Math.floor(Math.random() * contracts.length)];
      const newId = `evt_${Date.now()}`;

      const newEvent: StreamEvent = {
        id: newId,
        contractId: randomContract,
        eventType: randomType,
        timestamp: new Date().toISOString(),
        ledgerSequence: 4982107 + Math.floor(Math.random() * 50),
        txHash: `${Math.random().toString(16).substring(2, 12)}...`,
        topics: [randomType, `contract:${randomContract.substring(0, 6)}`],
        payload: {
          value: (Math.random() * 1000).toFixed(2),
          status: "SUCCESS",
          nonce: Math.floor(Math.random() * 10000),
        },
      };

      setEvents((prev) => [...prev.slice(-150), newEvent]);
    }, 2500);

    return () => clearInterval(interval);
  }, [connectionStatus, isPaused]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && streamContainerRef.current) {
      streamContainerRef.current.scrollTop = streamContainerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  // Fullscreen API toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      pageContainerRef.current?.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("Error attempting to exit fullscreen:", err);
      });
      setIsFullscreen(false);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
      if (e.code === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Copy event JSON helper
  const copyEventJson = (event: StreamEvent) => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered events
  const filteredEvents = events.filter((evt) => {
    if (contractFilter && !evt.contractId.toLowerCase().includes(contractFilter.toLowerCase())) {
      return false;
    }
    if (typeFilter && evt.eventType !== typeFilter) {
      return false;
    }
    if (dateFilter && !evt.timestamp.startsWith(dateFilter)) {
      return false;
    }
    return true;
  });

  // Render status badge indicator
  const renderStatusBadge = () => {
    if (connectionStatus === "connecting") {
      return (
        <span
          data-testid="status-badge-connecting"
          className="px-2 py-0.5 text-xs font-bold rounded bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/40 inline-flex items-center gap-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-terminal-cyan animate-pulse" />
          CONNECTING
        </span>
      );
    }
    if (connectionStatus === "disconnected" || connectionStatus === "error") {
      return (
        <span
          data-testid="status-badge-disconnected"
          className="px-2 py-0.5 text-xs font-bold rounded bg-terminal-danger/20 text-terminal-danger border border-terminal-danger/40 inline-flex items-center gap-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-terminal-danger" />
          {connectionStatus === "error" ? "ERROR" : "DISCONNECTED"}
        </span>
      );
    }
    if (isPaused) {
      return (
        <span
          data-testid="status-badge-paused"
          className="px-2 py-0.5 text-xs font-bold rounded bg-terminal-warning/20 text-terminal-warning border border-terminal-warning/40"
        >
          PAUSED
        </span>
      );
    }
    return (
      <span
        data-testid="status-badge-live"
        className="px-2 py-0.5 text-xs font-bold rounded bg-terminal-green/20 text-terminal-green border border-terminal-green/40 inline-flex items-center gap-1.5"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-terminal-green animate-ping" />
        LIVE STREAMING
      </span>
    );
  };

  return (
    <div
      ref={pageContainerRef}
      className={`min-h-screen bg-terminal-black text-terminal-green font-terminal-mono flex flex-col ${
        isFullscreen ? "p-4 sm:p-6" : "p-4 sm:p-8"
      }`}
    >
      {/* Top Header Control Bar */}
      <div className="flex flex-col gap-4 mb-4 border-b border-terminal-green/30 pb-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Radio
              className={`h-6 w-6 text-terminal-green ${
                connectionStatus === "connected" && !isPaused ? "animate-pulse" : "opacity-60"
              }`}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-terminal-green">
                  Live Event Stream
                </h1>
                {renderStatusBadge()}
              </div>
              <p className="text-xs text-terminal-gray">
                Real-time Soroban smart contract event log feed. Press [Space] to pause/resume.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {connectionStatus === "disconnected" || connectionStatus === "error" ? (
              <button
                type="button"
                onClick={handleReconnect}
                data-testid="reconnect-stream-btn"
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded border bg-terminal-green text-terminal-black border-terminal-green hover:bg-terminal-green/90 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Reconnect Stream
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                disabled={connectionStatus !== "connected"}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded border transition-colors ${
                  connectionStatus !== "connected"
                    ? "opacity-40 cursor-not-allowed bg-terminal-dark text-terminal-gray border-terminal-green/20"
                    : isPaused
                    ? "bg-terminal-green text-terminal-black border-terminal-green hover:bg-terminal-green/90"
                    : "bg-terminal-dark text-terminal-warning border-terminal-warning/40 hover:bg-terminal-warning/10"
                }`}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? "Resume Stream" : "Pause Stream"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setAutoScroll((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-2 text-xs rounded border transition-colors ${
                autoScroll
                  ? "bg-terminal-cyan/20 text-terminal-cyan border-terminal-cyan/40"
                  : "bg-terminal-dark text-terminal-gray border-terminal-green/20"
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" />
              Auto-Scroll: {autoScroll ? "ON" : "OFF"}
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-3 py-2 text-xs rounded border border-terminal-green/30 bg-terminal-dark text-terminal-green hover:bg-terminal-green/10 transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs border-t border-terminal-green/10">
          <div className="flex items-center gap-1.5 text-terminal-gray">
            <Filter className="h-4 w-4 text-terminal-cyan" />
            <span>Filters:</span>
          </div>

          {/* Contract Filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by Contract ID..."
              value={contractFilter}
              onChange={(e) => handleContractChange(e.target.value)}
              data-testid="contract-filter-input"
              className="bg-terminal-dark border border-terminal-green/30 text-terminal-green px-3 py-1.5 rounded w-48 text-xs focus:outline-none focus:border-terminal-cyan"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => handleTypeChange(e.target.value)}
            data-testid="event-type-filter-select"
            className="bg-terminal-dark border border-terminal-green/30 text-terminal-green px-3 py-1.5 rounded text-xs focus:outline-none focus:border-terminal-cyan"
          >
            <option value="">All Event Types</option>
            <option value="transfer">transfer</option>
            <option value="swap">swap</option>
            <option value="mint">mint</option>
            <option value="deposit">deposit</option>
            <option value="withdraw">withdraw</option>
            <option value="approve">approve</option>
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => handleDateChange(e.target.value)}
            data-testid="date-filter-input"
            className="bg-terminal-dark border border-terminal-green/30 text-terminal-green px-3 py-1.5 rounded text-xs focus:outline-none focus:border-terminal-cyan"
          />

          {(contractFilter || typeFilter || dateFilter) && (
            <button
              type="button"
              onClick={clearFilters}
              data-testid="clear-filters-btn"
              className="flex items-center gap-1 text-terminal-danger hover:underline px-2 py-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}

          <div className="ml-auto text-terminal-gray text-[11px]">
            Showing <span className="text-terminal-cyan font-bold">{filteredEvents.length}</span> / {events.length} events
          </div>
        </div>
      </div>

      {/* Main Stream Console Window */}
      <div
        ref={streamContainerRef}
        data-testid="live-stream-container"
        className="flex-1 overflow-y-auto rounded border border-terminal-green/30 bg-terminal-dark/80 p-4 space-y-3 font-mono text-xs"
        style={{ maxHeight: isFullscreen ? "calc(100vh - 140px)" : "calc(100vh - 240px)" }}
      >
        {/* 1. Connecting State */}
        {connectionStatus === "connecting" ? (
          <div
            data-testid="live-stream-connecting"
            className="flex flex-col items-center justify-center min-h-[260px] p-8 text-center space-y-4"
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-16 w-16 rounded-full border border-terminal-cyan/30 animate-ping" />
              <div className="h-12 w-12 rounded-full border-2 border-terminal-cyan border-t-transparent animate-spin flex items-center justify-center" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-terminal-cyan tracking-widest uppercase">
                [CONNECTING_TO_STREAM]
              </h3>
              <p className="text-xs text-terminal-gray max-w-sm">
                Establishing WebSocket connection to Soroban real-time event feed...
              </p>
            </div>
          </div>
        ) : connectionStatus === "disconnected" || connectionStatus === "error" ? (
          /* 2. Disconnected / Error State */
          <div
            data-testid="live-stream-error"
            className="flex flex-col items-center justify-center min-h-[260px] p-6 text-center"
          >
            <EmptyState
              variant="terminal"
              icon={<WifiOff className="h-10 w-10 text-terminal-danger" />}
              title={connectionStatus === "error" ? "STREAM_CONNECTION_ERROR" : "STREAM_DISCONNECTED"}
              description={
                connectionStatus === "error"
                  ? "Failed to receive events from Soroban RPC WebSocket. The stream encountered a network error."
                  : "Live event stream has been disconnected. Reconnect to resume receiving real-time events."
              }
              action={{
                label: "RECONNECT",
                onClick: handleReconnect,
                terminalVariant: "primary",
              }}
              data-testid="live-stream-disconnected-state"
              className="py-6"
            />
          </div>
        ) : events.length === 0 ? (
          /* 3. Connected With No Events State */
          <div
            data-testid="live-stream-empty"
            className="flex flex-col items-center justify-center min-h-[260px] p-6 text-center"
          >
            <EmptyState
              variant="terminal"
              icon={
                <EmptyStateIcon>
                  <Radio className="h-8 w-8 text-terminal-green animate-pulse" />
                </EmptyStateIcon>
              }
              title="NO_EVENTS_YET"
              description="Connected to Soroban event stream. Waiting for smart contract events to be emitted on-chain..."
              footer={
                <span className="text-[11px] text-terminal-gray/80">
                  [LISTENING] Protocol 22+ WebSocket feed active
                </span>
              }
              data-testid="live-stream-empty-state"
              className="py-6"
            />
          </div>
        ) : filteredEvents.length === 0 ? (
          /* 4. Filter No Match State */
          <div
            data-testid="live-stream-filter-empty"
            className="flex flex-col items-center justify-center min-h-[260px] p-6 text-center"
          >
            <EmptyState
              variant="terminal"
              icon={<Terminal className="h-8 w-8 text-terminal-gray/60" />}
              title="NO_MATCHING_EVENTS"
              description="No streaming events match the active filter criteria. Try clearing or relaxing your filters."
              action={{
                label: "CLEAR_FILTERS",
                onClick: clearFilters,
                terminalVariant: "secondary",
              }}
              data-testid="live-stream-filter-empty-state"
              className="py-6"
            />
          </div>
        ) : (
          /* 5. Stream Event Items */
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className="group rounded border border-terminal-green/15 bg-terminal-black/60 p-3 hover:border-terminal-green/40 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-terminal-green/10 pb-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-terminal-cyan uppercase bg-terminal-cyan/10 px-2 py-0.5 rounded border border-terminal-cyan/30">
                    {evt.eventType}
                  </span>
                  <span className="text-terminal-gray">Ledger #{evt.ledgerSequence}</span>
                  <span className="text-terminal-green font-semibold">Contract: {evt.contractId}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-terminal-gray">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyEventJson(evt)}
                    className="flex items-center gap-1 text-[11px] text-terminal-gray hover:text-terminal-green transition-colors px-2 py-0.5 rounded border border-terminal-green/20"
                    title="Copy Event JSON"
                  >
                    {copiedId === evt.id ? (
                      <>
                        <Check className="h-3 w-3 text-terminal-green" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy JSON
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Event Payload Details */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-[11px]">
                <div>
                  <span className="text-terminal-gray">Tx Hash: </span>
                  <span className="text-terminal-light">{evt.txHash}</span>
                </div>
                <div>
                  <span className="text-terminal-gray">Topics: </span>
                  <span className="text-terminal-warning">[{evt.topics.join(", ")}]</span>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-terminal-green/5 text-[11px] text-terminal-gray">
                <span className="text-terminal-cyan">Payload: </span>
                <code className="text-terminal-light">{JSON.stringify(evt.payload)}</code>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function LiveStreamingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-terminal-black p-8 text-terminal-green font-terminal-mono flex items-center justify-center">
          <p className="text-sm text-terminal-gray animate-pulse">Loading live stream...</p>
        </div>
      }
    >
      <LiveStreamingContent />
    </Suspense>
  );
}
