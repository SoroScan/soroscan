'use client';

import React, { Suspense } from 'react';
import { EventStreamProvider } from './context';
import { Toolbar } from './components/Toolbar';
import { FilterBar } from './components/FilterBar';
import { EventList } from './components/EventList';
import { useEventStream } from './context';

function ColumnHeader() {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-900 border-b border-zinc-800 font-mono text-[10px] uppercase tracking-widest text-zinc-600 select-none">
      <span className="w-3 flex-shrink-0" />
      <span className="w-[110px] flex-shrink-0">Timestamp</span>
      <span className="w-20 flex-shrink-0">Ledger</span>
      <span className="w-40 flex-shrink-0">Event Type</span>
      <span className="w-40 flex-shrink-0">Contract</span>
      <span className="flex-1">Tx Hash</span>
      <span className="w-6 flex-shrink-0" />
    </div>
  );
}

function PauseBanner() {
  const { isPaused, togglePause } = useEventStream();
  if (!isPaused) return null;
  return (
    <div className="flex items-center justify-center gap-3 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-xs font-mono">
      <span className="animate-pulse">⏸ stream paused</span>
      <button
        onClick={togglePause}
        className="underline hover:text-yellow-300 transition-colors"
      >
        resume
      </button>
      <span className="text-yellow-600">· press Space</span>
    </div>
  );
}

function StreamLayout() {
  const { containerRef } = useEventStream();
  return (
    <div ref={containerRef} className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      <Toolbar />
      <FilterBar />
      <PauseBanner />
      <ColumnHeader />
      <EventList />
    </div>
  );
}

export default function EventStreamPage() {
  return (
    <Suspense>
      <EventStreamProvider>
        <StreamLayout />
      </EventStreamProvider>
    </Suspense>
  );
}
