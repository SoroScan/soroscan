'use client';

import React, { useState } from 'react';
import { useWebhookTester } from '../context';

type Tab = 'body' | 'headers' | 'request';

function statusColor(status: number) {
  if (status >= 200 && status < 300) return 'text-green-400';
  if (status >= 300 && status < 400) return 'text-amber-400';
  if (status >= 400 && status < 500) return 'text-orange-400';
  return 'text-red-400';
}

export function ResponseViewer() {
  const { response, sendError, isSending, retryLastRequest, requestHeaders } = useWebhookTester();
  const [tab, setTab] = useState<Tab>('body');

  if (isSending) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-400 font-mono">dispatching…</span>
        </div>
      </div>
    );
  }

  if (sendError) {
    return (
      <div className="flex flex-col h-full bg-zinc-950">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg font-mono text-sm mb-4">
              <div className="text-red-400 font-semibold mb-2">✗ Request Failed</div>
              <div className="text-red-300 text-xs break-words">{sendError}</div>
            </div>
            <button
              onClick={retryLastRequest}
              className="w-full px-3 py-2 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition-colors"
            >
              Retry Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-950">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-zinc-800 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-zinc-500 font-mono">awaiting response</p>
        </div>
      </div>
    );
  }

  const bodyStr =
    typeof response.body === 'string'
      ? response.body
      : JSON.stringify(response.body, null, 2);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Status bar with timing */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900 font-mono text-xs">
        <div className="flex items-center gap-4">
          <span className="text-zinc-500">HTTP</span>
          <span className={`font-semibold ${statusColor(response.status)}`}>
            {response.status} {response.statusText}
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">{response.time}ms</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">{new Blob([bodyStr]).size}B</span>
        </div>
        <button
          onClick={retryLastRequest}
          className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors text-xs"
          title="Retry with same payload"
        >
          ↻ Retry
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {(['body', 'headers', 'request'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? 'border-blue-500 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t === 'body' && 'Response Body'}
            {t === 'headers' && `Response Headers (${Object.keys(response.headers).length})`}
            {t === 'request' && 'Request'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {tab === 'body' ? (
          <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-5">
            {bodyStr}
          </pre>
        ) : tab === 'headers' ? (
          <div className="space-y-1.5">
            {Object.entries(response.headers).map(([k, v]) => (
              <div key={k} className="flex gap-3 font-mono text-xs">
                <span className="text-blue-400 min-w-[180px] flex-shrink-0">{k}</span>
                <span className="text-zinc-300">{v}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-zinc-400 mb-2">Request Headers</div>
              <div className="space-y-1.5">
                {Object.entries(requestHeaders).map(([k, v]) => (
                  <div key={k} className="flex gap-3 font-mono text-xs">
                    <span className="text-green-400 min-w-[180px] flex-shrink-0">{k}</span>
                    <span className="text-zinc-300">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-3 border-t border-zinc-800">
              <div className="text-xs font-semibold text-zinc-400 mb-2">Timing</div>
              <div className="space-y-1 font-mono text-xs text-zinc-300">
                <div>Total: <span className="text-blue-400">{response.time}ms</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
