'use client';

import React, { useState } from 'react';
import { useEventStream } from '../context';
import type { StreamEvent } from '../types';

interface Props {
  event: StreamEvent;
  isNew?: boolean;
}

export function EventRow({ event, isNew }: Props) {
  const { copyEvent, copiedId } = useEventStream();
  const [expanded, setExpanded] = useState(false);

  const ts = new Date(event.timestamp);
  const timeStr = ts.toLocaleTimeString('en-US', { hour12: false });
  const dateStr = ts.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });

  return (
    <div
      className={`border-b border-zinc-800/60 transition-colors ${
        isNew ? 'bg-blue-500/5' : 'hover:bg-zinc-800/30'
      }`}
    >
      {/* Summary row */}
      <div className="flex items-center gap-3 px-4 py-2 font-mono text-xs cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Expand toggle */}
        <svg
          className={`w-3 h-3 text-zinc-600 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        {/* Timestamp */}
        <span className="text-zinc-600 flex-shrink-0 w-[110px]">
          {dateStr} <span className="text-zinc-400">{timeStr}</span>
        </span>

        {/* Ledger */}
        <span className="text-zinc-500 flex-shrink-0 w-20">
          #{event.ledger}
        </span>

        {/* Event type */}
        <span className="text-blue-400 flex-shrink-0 w-40 truncate">
          {event.event_type || '—'}
        </span>

        {/* Contract */}
        <span className="text-zinc-500 flex-shrink-0 w-40 truncate">
          {event.contract_id}
        </span>

        {/* tx_hash */}
        <span className="text-zinc-600 flex-1 truncate">
          {event.tx_hash || '—'}
        </span>

        {/* Copy button */}
        <button
          onClick={(e) => { e.stopPropagation(); copyEvent(event); }}
          className="flex-shrink-0 p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
          title="Copy event JSON"
        >
          {copiedId === event.id ? (
            <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Expanded payload */}
      {expanded && (
        <div className="px-10 pb-3">
          <pre className="text-xs text-zinc-300 font-mono bg-zinc-900 rounded p-3 overflow-x-auto leading-5 whitespace-pre-wrap">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
