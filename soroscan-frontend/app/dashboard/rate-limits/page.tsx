"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { RateLimitChart } from "./components/RateLimitChart";

interface ApiKeyMetrics {
  api_key_id: number;
  name: string;
  tier: string;
  quota_per_hour: number;
  hourly_hits: number[];
  avg_hits_per_hour: number;
  quota_used_percent: number;
  overage_events: number;
  projected_next_24h_hits: number;
  projected_overage: boolean;
}

interface RateLimitAnalyticsResponse {
  window_hours: number;
  generated_at: string;
  api_keys: ApiKeyMetrics[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RateLimitAnalyticsPage() {
  const [data, setData] = useState<RateLimitAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = getAccessToken();
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/analytics/rate-limits/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const payload: RateLimitAnalyticsResponse = await response.json();
      setData(payload);
      if (payload.api_keys.length > 0) {
        setSelectedKeyId((current) => current ?? payload.api_keys[0].api_key_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rate limit analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const selectedKey = useMemo(
    () => data?.api_keys.find((key) => key.api_key_id === selectedKeyId) ?? null,
    [data, selectedKeyId],
  );

  const chartData = useMemo(() => {
    if (!selectedKey) return [];
    const slice = selectedKey.hourly_hits.slice(-24);
    return slice.map((value, index) => ({
      label: `H${index + 1}`,
      value,
    }));
  }, [selectedKey]);

  const overageKeys = data?.api_keys.filter((key) => key.projected_overage) ?? [];

  return (
    <main className="min-h-screen bg-terminal-black p-8 text-terminal-green font-terminal-mono">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.2em] text-terminal-gray">[RATE_LIMIT_ANALYTICS]</p>
              <h1 className="text-3xl">API Quota Usage & Trends</h1>
              <p className="text-sm text-terminal-gray">
                7-day rolling window computed from Redis hourly counters.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="rounded border border-terminal-green/30 px-3 py-2 text-xs uppercase hover:bg-terminal-green/10"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        {loading && (
          <p className="animate-pulse text-sm text-terminal-gray">&gt; LOADING_ANALYTICS...</p>
        )}

        {error && (
          <div className="rounded border border-terminal-danger/40 bg-terminal-danger/10 p-4 text-terminal-danger">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && data && (
          <>
            {overageKeys.length > 0 && (
              <section className="rounded border border-terminal-warning/40 bg-terminal-warning/10 p-4">
                <h2 className="text-sm uppercase text-terminal-warning">Projected Overage Warnings</h2>
                <ul className="mt-2 space-y-1 text-sm">
                  {overageKeys.map((key) => (
                    <li key={key.api_key_id}>
                      {key.name} ({key.tier}) — projected {key.projected_next_24h_hits} hits/24h vs quota{" "}
                      {key.quota_per_hour}/hr
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard label="API Keys" value={String(data.api_keys.length)} hint="active keys" />
              <MetricCard
                label="Window"
                value={`${data.window_hours}h`}
                hint="rolling analytics window"
              />
              <MetricCard
                label="Overage Events"
                value={String(data.api_keys.reduce((sum, key) => sum + key.overage_events, 0))}
                hint="hours over quota (7d)"
              />
            </section>

            {data.api_keys.length > 0 && (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="api-key-select" className="text-xs uppercase text-terminal-gray">
                    API Key
                  </label>
                  <select
                    id="api-key-select"
                    value={selectedKeyId ?? ""}
                    onChange={(event) => setSelectedKeyId(Number(event.target.value))}
                    className="rounded border border-terminal-green/30 bg-terminal-black px-3 py-2 text-sm"
                  >
                    {data.api_keys.map((key) => (
                      <option key={key.api_key_id} value={key.api_key_id}>
                        {key.name} ({key.tier})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={fetchAnalytics}
                    className="rounded border border-terminal-green/30 px-3 py-2 text-xs uppercase hover:bg-terminal-green/10"
                  >
                    Refresh
                  </button>
                </div>

                {selectedKey && (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <MetricCard
                        label="Quota / Hour"
                        value={String(selectedKey.quota_per_hour)}
                        hint={`${selectedKey.tier} tier`}
                      />
                      <MetricCard
                        label="Avg Hits / Hour"
                        value={String(selectedKey.avg_hits_per_hour)}
                        hint="7-day average"
                      />
                      <MetricCard
                        label="Quota Used"
                        value={`${selectedKey.quota_used_percent}%`}
                        hint="avg vs hourly quota"
                      />
                      <MetricCard
                        label="Overage Hours"
                        value={String(selectedKey.overage_events)}
                        hint="hours over quota"
                      />
                    </div>

                    <RateLimitChart
                      title="Hourly Hits (Last 24h)"
                      data={chartData}
                      quotaLine={selectedKey.quota_per_hour}
                    />
                  </>
                )}
              </section>
            )}

            {data.api_keys.length === 0 && (
              <p className="text-sm text-terminal-gray">No active API keys found for your account.</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded border border-terminal-green/20 p-4">
      <p className="text-xs uppercase text-terminal-gray">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-terminal-gray">{hint}</p>
    </div>
  );
}
