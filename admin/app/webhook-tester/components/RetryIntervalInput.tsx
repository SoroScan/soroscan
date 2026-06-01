'use client';

import React, { useId } from 'react';
import { useWebhookTester } from '../context';

/** Preset suggestions (seconds) with human-readable labels */
const SUGGESTIONS: { label: string; value: number }[] = [
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '15m', value: 900 },
  { label: '1h', value: 3600 },
];

const MIN = 10;
const MAX = 3600;

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60 > 0 ? `${s % 60}s` : ''}`.trim();
  return '1h';
}

export function RetryIntervalInput() {
  const {
    selectedWebhook,
    retryInterval,
    setRetryInterval,
    retryIntervalError,
    isSavingRetryInterval,
    saveRetryInterval,
    retrySaveSuccess,
  } = useWebhookTester();

  const inputId = useId();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseInt(raw, 10);
    setRetryInterval(isNaN(parsed) ? 0 : parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') saveRetryInterval();
  };

  const isDisabled = !selectedWebhook || isSavingRetryInterval;
  const hasError = !!retryIntervalError;

  return (
    <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900">
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-widest text-zinc-400"
        >
          Retry Interval
        </label>
        {retrySaveSuccess && (
          <span className="text-xs text-green-400 font-mono" role="status" aria-live="polite">
            ✓ saved
          </span>
        )}
        {hasError && (
          <span className="text-xs text-red-400 font-mono truncate max-w-[180px]" role="alert">
            {retryIntervalError}
          </span>
        )}
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-1.5 mb-2" role="group" aria-label="Retry interval presets">
        {SUGGESTIONS.map(({ label, value }) => {
          const isActive = retryInterval === value;
          return (
            <button
              key={value}
              type="button"
              disabled={isDisabled}
              onClick={() => setRetryInterval(value)}
              aria-pressed={isActive}
              className={`text-xs px-2 py-0.5 rounded border transition-colors font-mono
                ${isActive
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600'
                }
                disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Number input + range slider + save button */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col flex-1 gap-1">
          {/* Numeric input */}
          <div className="flex items-center gap-2">
            <input
              id={inputId}
              type="number"
              min={MIN}
              max={MAX}
              step={1}
              value={retryInterval}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isDisabled}
              aria-describedby={hasError ? `${inputId}-error` : undefined}
              aria-invalid={hasError}
              className={`w-24 bg-zinc-950 border rounded px-2 py-1 text-sm font-mono text-zinc-100
                focus:outline-none transition-colors
                ${hasError
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-zinc-700 focus:border-zinc-500'
                }
                disabled:opacity-40 disabled:cursor-not-allowed`}
            />
            <span className="text-xs text-zinc-500 font-mono">
              {retryInterval >= MIN && retryInterval <= MAX
                ? formatSeconds(retryInterval)
                : 'seconds'}
            </span>
          </div>

          {/* Range slider */}
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={10}
            value={Math.min(Math.max(retryInterval, MIN), MAX)}
            onChange={(e) => setRetryInterval(parseInt(e.target.value, 10))}
            disabled={isDisabled}
            aria-label="Retry interval slider"
            className="w-full accent-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-zinc-600 font-mono">
            <span>{MIN}s</span>
            <span>1h</span>
          </div>
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={saveRetryInterval}
          disabled={isDisabled || hasError}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-700 text-zinc-200 text-xs font-medium
            hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 self-start mt-0.5"
          aria-label="Save retry interval"
        >
          {isSavingRetryInterval ? (
            <>
              <div className="w-3 h-3 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            'Save'
          )}
        </button>
      </div>

      {/* Accessible error description */}
      {hasError && (
        <p id={`${inputId}-error`} className="sr-only">
          {retryIntervalError}
        </p>
      )}
    </div>
  );
}
