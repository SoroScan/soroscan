'use client';

import React, { useEffect, useRef } from 'react';
import { useEventStream } from '../context';
import { EventRow } from './EventRow';

export function EventList() {
  const { events, autoScroll, isPaused, filters } = useEventStream();
  const topRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Auto-scroll to top (newest events are prepended)
  useEffect(() => {
    if (autoScroll && !isPaused && events.length > prevCountRef.current) {
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCountRef.current = events.length;
  }, [events.length, autoScroll, isPaused]);

  if (!filters.contractId) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
        <div className="w-14 h-14 mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
          <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        </div>
        <p className="text-sm text-zinc-500 font-mono">select a contract to start streaming</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-zinc-500 font-mono">listening for events…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div ref={topRef} />
      {events.map((event, i) => (
        <EventRow key={event.id} event={event} isNew={i === 0} />
      ))}
    </div>
  );
}
