"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/auth";

interface CostBucket {
  key: string;
  label: string;
  spendUsd: number;
}

interface OperationBucket {
  key: string;
  label: string;
  eventCount: number;
}

interface CostAnalysisData {
  snapshotCount: number;
  actualCostUsd: number;
  projectedCostUsd: number;
  monthlyBudgetUsd: number | null;
  byContract: CostBucket[];
  byOperation: OperationBucket[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4,
});

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function numericValue(value: unknown, field: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) {
    throw new Error(`Cost API returned an invalid ${field}.`);
  }
  return parsed;
}

function adaptCostSnapshots(payload: unknown): CostAnalysisData {
  const response = asRecord(payload);
  if (!response || !Array.isArray(response.results)) {
    throw new Error("Cost API returned an invalid response.");
  }

  let actualCostUsd = 0;
  let projectedCostUsd = 0;
  let monthlyBudgetUsd = 0;
  let hasBudget = false;
  let snapshotCount = 0;
  const contracts = new Map<string, number>();
  const operations = new Map<string, number>();

  response.results.forEach((value) => {
    const snapshot = asRecord(value);
    if (!snapshot) {
      throw new Error("Cost API returned an invalid organization snapshot.");
    }
    snapshotCount += 1;

    actualCostUsd += numericValue(snapshot.actual_cost_usd, "actual cost");
    projectedCostUsd += numericValue(snapshot.projected_monthly_cost_usd, "projected cost");

    const budget = asRecord(snapshot.budget);
    if (budget && budget.is_active !== false) {
      monthlyBudgetUsd += numericValue(budget.monthly_budget_usd, "monthly budget");
      hasBudget = true;
    }

    const breakdown = asRecord(snapshot.breakdown);
    if (!breakdown) {
      throw new Error("Cost API returned an invalid cost breakdown.");
    }

    const contractBreakdown = asRecord(breakdown.contracts) ?? {};
    for (const [contractId, value] of Object.entries(contractBreakdown)) {
      const contract = asRecord(value);
      if (!contract) {
        throw new Error("Cost API returned an invalid contract cost.");
      }
      const spend = numericValue(contract.estimated_cost_usd ?? 0, "contract cost");
      contracts.set(contractId, (contracts.get(contractId) ?? 0) + spend);
    }

    const operationBreakdown = asRecord(breakdown.event_types) ?? {};
    for (const [eventType, value] of Object.entries(operationBreakdown)) {
      const eventCount = numericValue(value, "event count");
      operations.set(eventType, (operations.get(eventType) ?? 0) + eventCount);
    }

  });

  return {
    snapshotCount,
    actualCostUsd,
    projectedCostUsd,
    monthlyBudgetUsd: hasBudget ? monthlyBudgetUsd : null,
    byContract: Array.from(contracts, ([key, spendUsd]) => ({
      key,
      label: key,
      spendUsd,
    })).sort((a, b) => b.spendUsd - a.spendUsd),
    byOperation: Array.from(operations, ([key, eventCount]) => ({
      key,
      label: key,
      eventCount,
    })).sort((a, b) => b.eventCount - a.eventCount),
  };
}

export default function CostAnalysisPage() {
  const [data, setData] = useState<CostAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const month = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    let active = true;

    async function loadCosts() {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const response = await authenticatedFetch(
          `${API_BASE}/api/ingest/admin/organization-costs/?month=${month}`,
          { cache: "no-store" },
        );
        if (response.status === 403) {
          throw new Error("Staff access is required to view organization cost analysis.");
        }
        if (!response.ok) {
          throw new Error(`Failed to load organization costs (HTTP ${response.status}).`);
        }

        const result = adaptCostSnapshots(await response.json());
        if (active) setData(result);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load organization costs.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCosts();
    return () => {
      active = false;
    };
  }, [month, reloadKey]);

  const budgetUsage = data?.monthlyBudgetUsd
    ? (data.actualCostUsd / data.monthlyBudgetUsd) * 100
    : null;
  const maxContractSpend = Math.max(0, ...(data?.byContract.map((item) => item.spendUsd) ?? []));

  return (
    <main className="min-h-screen bg-terminal-black p-8 font-terminal-mono text-terminal-green">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.2em] text-terminal-gray">[COST_ANALYSIS_DASHBOARD]</p>
          <h1 className="text-3xl">Organization Cost Analysis</h1>
          <p className="text-sm text-terminal-gray">
            Current-month usage and cost snapshots for organizations.
          </p>
        </header>

        {loading ? (
          <div role="status" aria-busy="true" className="py-12 text-center text-terminal-cyan">
            Loading organization costs…
          </div>
        ) : error ? (
          <section role="alert" className="space-y-4 rounded border border-terminal-danger/30 p-6 text-center">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="rounded border border-terminal-green/30 px-3 py-2 text-sm"
            >
              Retry
            </button>
          </section>
        ) : !data || data.snapshotCount === 0 ? (
          <section className="rounded border border-terminal-cyan/20 p-6 text-center text-sm text-terminal-gray">
            No organization cost snapshots are available for {month}.
          </section>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Tile label="Actual Cost" value={currencyFormatter.format(data.actualCostUsd)} />
              <Tile label="Projected Month Cost" value={currencyFormatter.format(data.projectedCostUsd)} />
              <Tile
                label="Monthly Budget"
                value={data.monthlyBudgetUsd === null ? "—" : currencyFormatter.format(data.monthlyBudgetUsd)}
              />
              <Tile
                label="Budget Used"
                value={budgetUsage === null ? "—" : `${budgetUsage.toFixed(1)}%`}
              />
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <article className="rounded border border-terminal-cyan/20 p-4">
                <h2 className="mb-3 text-sm text-terminal-cyan">Cost Breakdown by Contract</h2>
                <div className="space-y-3 text-xs">
                  {data.byContract.length === 0 ? (
                    <p className="text-terminal-gray">No contract costs recorded for this month.</p>
                  ) : data.byContract.map((item) => (
                    <div key={item.key}>
                      <div className="flex justify-between gap-4">
                        <span className="break-all">{item.label}</span>
                        <span>{currencyFormatter.format(item.spendUsd)}</span>
                      </div>
                      <div className="mt-1 h-2 rounded bg-terminal-cyan/10">
                        <div
                          className="h-2 rounded bg-terminal-cyan"
                          style={{
                            width: maxContractSpend > 0 ? `${(item.spendUsd / maxContractSpend) * 100}%` : "0%",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded border border-terminal-magenta/20 p-4">
                <h2 className="mb-3 text-sm text-terminal-magenta">Events by Operation Type</h2>
                <div className="space-y-2 text-xs">
                  {data.byOperation.length === 0 ? (
                    <p className="text-terminal-gray">No event types recorded for this month.</p>
                  ) : data.byOperation.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-4 rounded border border-terminal-magenta/20 px-2 py-2"
                    >
                      <span className="break-all">{item.label}</span>
                      <span>{item.eventCount.toLocaleString()} events</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded border border-terminal-green/20 bg-black/30 p-4">
      <p className="text-xs text-terminal-gray">{label}</p>
      <p className="mt-2 text-xl">{value}</p>
    </article>
  );
}
