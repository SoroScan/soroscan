"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/terminal/Card";
import { Button } from "@/components/terminal/Button";
import {
  listContracts,
  listWebhooks,
} from "@/components/ingest/contract-graphql";
import { fetchTimeline } from "@/components/ingest/graphql";
import type { Contract } from "@/components/ingest/contract-types";
import type { TimelineBucketSize } from "@/components/ingest/types";

function DiffBadge({ a, b }: { a: number; b: number }) {
  if (a > b) {
    return <span className="text-[10px] text-terminal-green border border-terminal-green/50 bg-terminal-green/10 px-1.5 py-0.5">A+</span>;
  }
  if (a < b) {
    return <span className="text-[10px] text-terminal-danger border border-terminal-danger/50 bg-terminal-danger/10 px-1.5 py-0.5">B+</span>;
  }
  return <span className="text-[10px] text-terminal-gray border border-terminal-gray/50 bg-terminal-gray/10 px-1.5 py-0.5">EQ</span>;
}

function ActivityBarChart({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) {
    return (
      <div className="text-terminal-gray text-xs text-center py-8">NO_ACTIVITY_DATA</div>
    );
  }
  return (
    <div className="h-40 w-full">
      <div className="flex items-end gap-1 h-full">
        {data.map((point, i) => {
          const height = (point.value / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center group">
              <div
                className="w-full bg-terminal-green/60 border-t border-terminal-green group-hover:bg-terminal-green transition-all relative"
                style={{ height: `${height}%` }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-terminal-green font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-terminal-black px-1 border border-terminal-green/50">
                  {point.value}
                </div>
              </div>
              <div className="mt-1 text-[7px] text-terminal-gray rotate-45 origin-left whitespace-nowrap opacity-60">
                {point.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityPatternCard({
  title,
  timeline,
  loading,
}: {
  title: string;
  timeline: { since: string; until: string; groups: { eventCount: number }[] } | null;
  loading: boolean;
}) {
  const data = React.useMemo(() => {
    if (!timeline) return [];
    return timeline.groups.map((g) => ({
      label: new Date(g.end).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      value: g.eventCount,
    }));
  }, [timeline]);

  return (
    <div className="border border-terminal-green/20 bg-terminal-black p-3">
      <div className="text-[10px] text-terminal-gray tracking-widest mb-2 uppercase">[{title}]</div>
      {loading ? (
        <div className="text-terminal-gray text-xs animate-pulse py-8 text-center">LOADING_TIMELINE...</div>
      ) : (
        <ActivityBarChart data={data} />
      )}
    </div>
  );
}

export default function ContractComparePage() {
  const router = useRouter();
  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [contractAId, setContractAId] = React.useState<string>("");
  const [contractBId, setContractBId] = React.useState<string>("");
  const [loadingContracts, setLoadingContracts] = React.useState(true);
  const [loadingA, setLoadingA] = React.useState(false);
  const [loadingB, setLoadingB] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [webhooksA, setWebhooksA] = React.useState<{ id: string; contractId: string }[]>([]);
  const [webhooksB, setWebhooksB] = React.useState<{ id: string; contractId: string }[]>([]);
  const [timelineA, setTimelineA] = React.useState<{ since: string; until: string; groups: { eventCount: number }[] } | null>(null);
  const [timelineB, setTimelineB] = React.useState<{ since: string; until: string; groups: { eventCount: number }[] } | null>(null);

  React.useEffect(() => {
    const loadContracts = async () => {
      try {
        const data = await listContracts();
        setContracts(data);
        if (data.length >= 2) {
          setContractAId(data[0].id);
          setContractBId(data[1].id);
        } else if (data.length === 1) {
          setContractAId(data[0].id);
          setContractBId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contracts");
      } finally {
        setLoadingContracts(false);
      }
    };
    loadContracts();
  }, []);

  React.useEffect(() => {
    if (!contractAId) return;
    const abortController = new AbortController();
    const loadA = async () => {
      setLoadingA(true);
      try {
        const [timeline, allWebhooks] = await Promise.all([
          fetchTimeline({
            contractId: contractAId,
            bucketSize: "ONE_DAY" as TimelineBucketSize,
            eventTypes: null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            includeEvents: false,
            limitGroups: 30,
          }),
          listWebhooks(),
        ]);
        if (!abortController.signal.aborted) {
          setTimelineA({
            since: timeline.since,
            until: timeline.until,
            groups: timeline.groups,
          });
          setWebhooksA(allWebhooks.filter((w) => w.contractId === contractAId));
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("Failed to load Contract A data", err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingA(false);
        }
      }
    };
    loadA();
    return () => abortController.abort();
  }, [contractAId]);

  React.useEffect(() => {
    if (!contractBId) return;
    const abortController = new AbortController();
    const loadB = async () => {
      setLoadingB(true);
      try {
        const [timeline, allWebhooks] = await Promise.all([
          fetchTimeline({
            contractId: contractBId,
            bucketSize: "ONE_DAY" as TimelineBucketSize,
            eventTypes: null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            includeEvents: false,
            limitGroups: 30,
          }),
          listWebhooks(),
        ]);
        if (!abortController.signal.aborted) {
          setTimelineB({
            since: timeline.since,
            until: timeline.until,
            groups: timeline.groups,
          });
          setWebhooksB(allWebhooks.filter((w) => w.contractId === contractBId));
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("Failed to load Contract B data", err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingB(false);
        }
      }
    };
    loadB();
    return () => abortController.abort();
  }, [contractBId]);

  const contractA = contracts.find((c) => c.id === contractAId);
  const contractB = contracts.find((c) => c.id === contractBId);

  const swapContracts = () => {
    const prevA = contractAId;
    setContractAId(contractBId);
    setContractBId(prevA);
  };

  if (loadingContracts) {
    return (
      <div className="min-h-screen bg-terminal-black font-terminal-mono p-8">
        <div className="text-center text-terminal-gray py-24">LOADING_CONTRACTS...</div>
      </div>
    );
  }

  if (contracts.length < 2) {
    return (
      <div className="min-h-screen bg-terminal-black font-terminal-mono p-8">
        <Card title="COMPARE_CONTRACTS">
          <div className="text-terminal-gray text-sm py-8 text-center">
            Need at least 2 tracked contracts to use comparison view.{" "}
            <Button variant="secondary" size="sm" onClick={() => router.push("/contracts")}>
              REGISTER_CONTRACTS
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const countA = contractA?.eventCount ?? 0;
  const countB = contractB?.eventCount ?? 0;
  const subsA = webhooksA.length;
  const subsB = webhooksB.length;
  const totalA = timelineA ? timelineA.groups.reduce((sum, g) => sum + g.eventCount, 0) : 0;
  const totalB = timelineB ? timelineB.groups.reduce((sum, g) => sum + g.eventCount, 0) : 0;

  const diffRows: { label: string; a: number | string; b: number | string }[] = [
    { label: "EVENT_COUNT", a: countA, b: countB },
    { label: "WEBHOOK_SUBSCRIPTIONS", a: subsA, b: subsB },
    { label: "EVENTS_LAST_30_DAYS", a: totalA, b: totalB },
  ];

  return (
    <div className="min-h-screen bg-terminal-black font-terminal-mono">
      <main className="container mx-auto px-6 md:px-8 py-10 max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-terminal-green">CONTRACT_COMPARISON</h1>
            <p className="text-terminal-gray text-xs mt-2 tracking-widest">
              SIDE-BY-SIDE_ANALYSIS / EVENT_COUNTS / WEBHOOK_ACTIVITY
            </p>
          </div>
          <Button variant="secondary" onClick={swapContracts} className="whitespace-nowrap">
            SWAP_A_B
          </Button>
        </div>

        {error && (
          <div className="border border-terminal-danger bg-terminal-danger/10 p-3 text-terminal-danger text-xs">
            {error}
          </div>
        )}

        <Card title="SELECT_CONTRACTS">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-terminal-cyan tracking-widest uppercase">Contract A</label>
              <select
                value={contractAId}
                onChange={(e) => setContractAId(e.target.value)}
                className="w-full bg-terminal-black border border-terminal-green/40 text-terminal-green text-sm p-2 font-terminal-mono focus:border-terminal-green outline-none"
              >
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.contractId.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-terminal-cyan tracking-widest uppercase">Contract B</label>
              <select
                value={contractBId}
                onChange={(e) => setContractBId(e.target.value)}
                className="w-full bg-terminal-black border border-terminal-green/40 text-terminal-green text-sm p-2 font-terminal-mono focus:border-terminal-green outline-none"
              >
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.contractId.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-terminal-green text-terminal-black px-1.5 py-0.5 font-bold">A</span>
              <h2 className="text-lg text-terminal-green font-bold truncate">{contractA?.name ?? "--"}</h2>
              <span className="text-terminal-gray text-xs font-terminal-mono">{contractA?.contractId.slice(0, 8)}...</span>
            </div>

            <Card title="EVENT_COUNT">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-terminal-green">{countA.toLocaleString()}</span>
                <DiffBadge a={countA} b={countB} />
              </div>
            </Card>

            <Card title="RECENT_EVENTS">
              <div className="space-y-2">
                {loadingA ? (
                  <div className="text-terminal-gray text-xs animate-pulse text-center py-6">LOADING_EVENTS...</div>
                ) : eventsA.length === 0 ? (
                  <div className="text-terminal-gray text-xs text-center py-6">NO_EVENTS_FOUND</div>
                ) : (
                  eventsA.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="border-b border-terminal-green/10 pb-2 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-terminal-cyan uppercase">{ev.eventType}</span>
                        <span className="text-[10px] text-terminal-gray">
                          {new Date(ev.timestamp).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                      <div className="text-[10px] text-terminal-gray font-terminal-mono truncate mt-1">{ev.txHash}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card title="WEBHOOK_SUBSCRIPTIONS">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-terminal-cyan">{subsA}</span>
                <DiffBadge a={subsA} b={subsB} />
              </div>
            </Card>

            <ActivityPatternCard title="ACTIVITY_PATTERN" timeline={timelineA} loading={loadingA} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-terminal-cyan text-terminal-black px-1.5 py-0.5 font-bold">B</span>
              <h2 className="text-lg text-terminal-cyan font-bold truncate">{contractB?.name ?? "--"}</h2>
              <span className="text-terminal-gray text-xs font-terminal-mono">{contractB?.contractId.slice(0, 8)}...</span>
            </div>

            <Card title="EVENT_COUNT">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-terminal-cyan">{countB.toLocaleString()}</span>
                <DiffBadge a={countA} b={countB} />
              </div>
            </Card>

            <Card title="RECENT_EVENTS">
              <div className="space-y-2">
                {loadingB ? (
                  <div className="text-terminal-gray text-xs animate-pulse text-center py-6">LOADING_EVENTS...</div>
                ) : eventsB.length === 0 ? (
                  <div className="text-terminal-gray text-xs text-center py-6">NO_EVENTS_FOUND</div>
                ) : (
                  eventsB.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="border-b border-terminal-green/10 pb-2 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-terminal-cyan uppercase">{ev.eventType}</span>
                        <span className="text-[10px] text-terminal-gray">
                          {new Date(ev.timestamp).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                      <div className="text-[10px] text-terminal-gray font-terminal-mono truncate mt-1">{ev.txHash}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card title="WEBHOOK_SUBSCRIPTIONS">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-terminal-green">{subsB}</span>
                <DiffBadge a={subsA} b={subsB} />
              </div>
            </Card>

            <ActivityPatternCard title="ACTIVITY_PATTERN" timeline={timelineB} loading={loadingB} />
          </div>
        </div>

        <Card title="DIFF_SUMMARY">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-terminal-mono">
              <thead>
                <tr className="text-terminal-gray border-b border-terminal-green/20">
                  <th className="py-2 pr-4">METRIC</th>
                  <th className="py-2 px-4 text-terminal-green">A</th>
                  <th className="py-2 px-4 text-terminal-cyan">B</th>
                  <th className="py-2 pl-4">DELTA</th>
                </tr>
              </thead>
              <tbody>
                {diffRows.map((row) => {
                  const aNum = typeof row.a === "number" ? row.a : 0;
                  const bNum = typeof row.b === "number" ? row.b : 0;
                  const delta = aNum - bNum;
                  const deltaLabel =
                    typeof row.a === "number" && typeof row.b === "number"
                      ? `${delta >= 0 ? "+" : ""}${delta.toLocaleString()}`
                      : "—";
                  const deltaColor =
                    delta > 0
                      ? "text-terminal-green"
                      : delta < 0
                        ? "text-terminal-danger"
                        : "text-terminal-gray";
                  return (
                    <tr key={row.label} className="border-b border-terminal-green/10 last:border-0">
                      <td className="py-3 pr-4 text-terminal-gray uppercase tracking-wider">{row.label}</td>
                      <td className="py-3 px-4 text-terminal-green">{typeof row.a === "number" ? row.a.toLocaleString() : row.a}</td>
                      <td className="py-3 px-4 text-terminal-cyan">{typeof row.b === "number" ? row.b.toLocaleString() : row.b}</td>
                      <td className={`py-3 pl-4 font-bold ${deltaColor}`}>{deltaLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
