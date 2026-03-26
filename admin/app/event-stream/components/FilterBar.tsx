'use client';

import React from 'react';
import { useEventStream } from '../context';

export function FilterBar() {
  const { filters, setFilters, applyFilters, contracts } = useEventStream();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-800"
    >
      {/* Contract selector */}
      <select
        value={filters.contractId}
        onChange={(e) => setFilters({ contractId: e.target.value })}
        className="h-8 px-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono focus:outline-none focus:border-blue-500 min-w-[180px]"
      >
        <option value="">All contracts</option>
        {contracts.map((c) => (
          <option key={c.id} value={c.contract_id}>
            {c.name || c.contract_id}
          </option>
        ))}
      </select>

      {/* Event type */}
      <input
        type="text"
        placeholder="event_type"
        value={filters.eventType}
        onChange={(e) => setFilters({ eventType: e.target.value })}
        className="h-8 px-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono focus:outline-none focus:border-blue-500 w-36"
      />

      {/* Since */}
      <input
        type="datetime-local"
        value={filters.since}
        onChange={(e) => setFilters({ since: e.target.value })}
        className="h-8 px-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-mono focus:outline-none focus:border-blue-500"
        title="Since"
      />

      {/* Until */}
      <input
        type="datetime-local"
        value={filters.until}
        onChange={(e) => setFilters({ until: e.target.value })}
        className="h-8 px-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-mono focus:outline-none focus:border-blue-500"
        title="Until"
      />

      <button
        type="submit"
        className="h-8 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
      >
        Apply
      </button>
    </form>
  );
}
