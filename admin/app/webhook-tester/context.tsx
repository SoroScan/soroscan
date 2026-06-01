'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import type { WebhookSubscription, TestResponse, HistoryEntry } from './types';
import { DEFAULT_PAYLOAD } from './types';

const BASE_URL = 'http://localhost:8000';

interface WebhookTesterContextType {
  // Webhooks list
  webhooks: WebhookSubscription[];
  isLoadingWebhooks: boolean;
  fetchWebhooks: () => Promise<void>;

  // Selected webhook
  selectedWebhook: WebhookSubscription | null;
  setSelectedWebhook: (w: WebhookSubscription | null) => void;

  // Payload editor
  payload: string;
  setPayload: (p: string) => void;
  payloadError: string | null;

  // Send
  isSending: boolean;
  sendTest: () => Promise<void>;
  retryLastRequest: () => Promise<void>;

  // Response
  response: TestResponse | null;
  sendError: string | null;
  requestHeaders: Record<string, string>;

  // History
  history: HistoryEntry[];
  clearHistory: () => void;
  selectHistoryEntry: (entry: HistoryEntry) => void;

  // Retry interval
  retryInterval: number;
  setRetryInterval: (v: number) => void;
  retryIntervalError: string | null;
  isSavingRetryInterval: boolean;
  saveRetryInterval: () => Promise<void>;
  retrySaveSuccess: boolean;
}

const WebhookTesterContext = createContext<WebhookTesterContextType | undefined>(undefined);

export function WebhookTesterProvider({ children }: { children: ReactNode }) {
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false);
  const [selectedWebhook, setSelectedWebhookState] = useState<WebhookSubscription | null>(null);
  const [payload, setPayloadState] = useState(DEFAULT_PAYLOAD);
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<TestResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [requestHeaders, setRequestHeaders] = useState<Record<string, string>>({});
  const lastRequestRef = useRef<{ webhook: WebhookSubscription; payload: string } | null>(null);

  // Retry interval state
  const [retryInterval, setRetryIntervalState] = useState(60);
  const [retryIntervalError, setRetryIntervalError] = useState<string | null>(null);
  const [isSavingRetryInterval, setIsSavingRetryInterval] = useState(false);
  const [retrySaveSuccess, setRetrySaveSuccess] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    setIsLoadingWebhooks(true);
    try {
      const res = await fetch(`${BASE_URL}/api/ingest/webhooks/?page_size=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setWebhooks(data.results ?? data);
    } catch {
      setWebhooks([]);
    } finally {
      setIsLoadingWebhooks(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const setSelectedWebhook = useCallback((w: WebhookSubscription | null) => {
    setSelectedWebhookState(w);
    setResponse(null);
    setSendError(null);
    setRetrySaveSuccess(false);
    if (w) {
      try {
        const parsed = JSON.parse(payload);
        parsed.contract_id = w.contract_id;
        if (w.event_type) parsed.event_type = w.event_type;
        setPayloadState(JSON.stringify(parsed, null, 2));
      } catch {
        // keep existing payload
      }
    }
  }, [payload]);

  const setPayload = useCallback((p: string) => {
    setPayloadState(p);
    try {
      JSON.parse(p);
      setPayloadError(null);
    } catch (e) {
      setPayloadError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }, []);

  const performSend = useCallback(async (webhook: WebhookSubscription, payloadStr: string) => {
    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(payloadStr);
    } catch (e) {
      setPayloadError(e instanceof Error ? e.message : 'Invalid JSON');
      return;
    }

    setIsSending(true);
    setResponse(null);
    setSendError(null);

    const start = performance.now();
    const headers = { 'Content-Type': 'application/json' };
    setRequestHeaders(headers);

    try {
      const res = await fetch(
        `${BASE_URL}/api/ingest/webhooks/${webhook.id}/test/`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(parsedPayload),
        }
      );

      const elapsed = Math.round(performance.now() - start);
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { responseHeaders[k] = v; });

      let body: unknown;
      const ct = res.headers.get('content-type') ?? '';
      body = ct.includes('application/json') ? await res.json() : await res.text();

      const testResponse: TestResponse = {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body,
        time: elapsed,
      };

      setResponse(testResponse);

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        webhookId: webhook.id,
        targetUrl: webhook.target_url,
        payload: payloadStr,
        response: testResponse,
        requestHeaders: headers,
      };
      setHistory(prev => [entry, ...prev].slice(0, 50));
      lastRequestRef.current = { webhook, payload: payloadStr };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setSendError(msg);
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        webhookId: webhook.id,
        targetUrl: webhook.target_url,
        payload: payloadStr,
        error: msg,
        requestHeaders: headers,
      };
      setHistory(prev => [entry, ...prev].slice(0, 50));
    } finally {
      setIsSending(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    if (!selectedWebhook) return;
    await performSend(selectedWebhook, payload);
  }, [selectedWebhook, payload, performSend]);

  const retryLastRequest = useCallback(async () => {
    if (!lastRequestRef.current) return;
    const { webhook, payload: lastPayload } = lastRequestRef.current;
    await performSend(webhook, lastPayload);
  }, [performSend]);

  const clearHistory = useCallback(() => setHistory([]), []);

  const setRetryInterval = useCallback((v: number) => {
    setRetryIntervalState(v);
    if (v < 10 || v > 3600) {
      setRetryIntervalError('Must be between 10 and 3600 seconds');
    } else {
      setRetryIntervalError(null);
    }
    setRetrySaveSuccess(false);
  }, []);

  const saveRetryInterval = useCallback(async () => {
    if (!selectedWebhook) return;
    if (retryInterval < 10 || retryInterval > 3600) {
      setRetryIntervalError('Must be between 10 and 3600 seconds');
      return;
    }
    setIsSavingRetryInterval(true);
    setRetrySaveSuccess(false);
    try {
      const res = await fetch(
        `${BASE_URL}/api/ingest/webhooks/${selectedWebhook.id}/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ retry_interval_seconds: retryInterval }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: WebhookSubscription = await res.json();
      // Update the webhook in the list and selected state
      setWebhooks(prev => prev.map(w => w.id === updated.id ? updated : w));
      setSelectedWebhookState(updated);
      setRetrySaveSuccess(true);
      setTimeout(() => setRetrySaveSuccess(false), 3000);
    } catch (err) {
      setRetryIntervalError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSavingRetryInterval(false);
    }
  }, [selectedWebhook, retryInterval]);

  const selectHistoryEntry = useCallback((entry: HistoryEntry) => {
    setPayloadState(entry.payload);
    setPayloadError(null);
    setResponse(entry.response ?? null);
    setSendError(entry.error ?? null);
    setRequestHeaders(entry.requestHeaders ?? {});
    const wh = webhooks.find(w => w.id === entry.webhookId);
    if (wh) setSelectedWebhookState(wh);
  }, [webhooks]);

  return (
    <WebhookTesterContext.Provider value={{
      webhooks, isLoadingWebhooks, fetchWebhooks,
      selectedWebhook, setSelectedWebhook,
      payload, setPayload, payloadError,
      isSending, sendTest, retryLastRequest,
      response, sendError, requestHeaders,
      history, clearHistory, selectHistoryEntry,
      retryInterval, setRetryInterval, retryIntervalError,
      isSavingRetryInterval, saveRetryInterval, retrySaveSuccess,
    }}>
      {children}
    </WebhookTesterContext.Provider>
  );
}

export function useWebhookTester() {
  const ctx = useContext(WebhookTesterContext);
  if (!ctx) throw new Error('useWebhookTester must be used within WebhookTesterProvider');
  return ctx;
}
