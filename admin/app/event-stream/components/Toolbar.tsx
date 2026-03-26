'use client';

import React from 'react';
import { useEventStream } from '../context';

export function Toolbar() {
  const {
    isConnected,
    isPaused,
    togglePause,
    events,
    clearEvents,
    autoScroll,
    setAutoScroll,
    isFullscreen,
    toggleFullscreen,
  } = useEventStream();

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-zinc-950 border-b border-zinc-800">
      {/* Brand / title */}
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mr-2">
        Event Stream
      </span>

      {/* Connection status */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isConnected ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'
          }`}
        />
        <span className="text-xs font-mono text-zinc-500">
          {isConnected ? 'live' : 'disconnected'}
        </span>
      </div>

      <span className="text-zinc-700">|</span>

      {/* Event count */}
      <span className="text-xs font-mono text-zinc-500">
        {events.length} event{events.length !== 1 ? 's' : ''}
      </span>

      <div className="flex-1" />

      {/* Auto-scroll toggle */}
      <button
        onClick={() => setAutoScroll(!autoScroll)}
        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${
          autoScroll
            ? 'bg-zinc-700 text-zinc-200'
            : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
        }`}
        title="Toggle auto-scroll"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        auto-scroll
      </button>

      {/* Pause / Resume — spacebar shortcut hint */}
      <button
        onClick={togglePause}
        className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded font-medium transition-colors ${
          isPaused
            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
        }`}
        title="Pause / Resume (Space)"
      >
        {isPaused ? (
          <>
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Resume
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
            Pause
          </>
        )}
        <kbd className="ml-1 text-zinc-600 text-[10px]">Space</kbd>
      </button>

      {/* Clear */}
      <button
        onClick={clearEvents}
        className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Clear events"
      >
        Clear
      </button>

      {/* Fullscreen */}
      <button
        onClick={toggleFullscreen}
        className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
      >
        {isFullscreen ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>
    </div>
  );
}
