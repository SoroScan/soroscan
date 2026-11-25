"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { authenticatedFetch } from "@/lib/auth";

type UpgradeStatus = "deployed" | "upgraded";

interface UpgradeEvent {
  id: string;
  contract: string;
  type: UpgradeStatus;
  version: string;
  timestamp: string;
  ledger: number;
  bytecodeHash: string;
  deployer: string;
  txHash: string;
  notes: string;
}

interface VersionSnapshot {
  version: string;
  validFromLedger: number;
  validToLedger: number | null;
  hasBreakingChanges: boolean;
  breakingChangeDetails: string;
}

interface CompatibilityWarning {
  id: string;
  version: string;
  ledger: number;
  detail: string;
}

interface DeploymentTimeline {
  contractId: string;
  deployments: UpgradeEvent[];
  versions: VersionSnapshot[];
  warnings: CompatibilityWarning[];
}

interface TimelineRequest {
  contractId: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new Error(`Deployment API returned an invalid ${key} list.`);
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(`Deployment API returned an invalid ${field}.`);
  }
  return value;
}

function requiredNumber(value: unknown, field: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) {
    throw new Error(`Deployment API returned an invalid ${field}.`);
  }
  return parsed;
}

function adaptDeploymentTimeline(payload: unknown): DeploymentTimeline {
  const response = asRecord(payload);
  if (!response) {
    throw new Error("Deployment API returned an invalid response.");
  }

  const contractId = requiredString(response.contract_id, "contract ID");
  const versions: VersionSnapshot[] = requiredArray(response, "abi_versions").map((value) => {
    const abi = asRecord(value);
    if (!abi) {
      throw new Error("Deployment API returned an invalid ABI version.");
    }

    const versionNumber = requiredNumber(abi.version_number, "ABI version");
    const validToLedger =
      abi.valid_to_ledger === null
        ? null
        : requiredNumber(abi.valid_to_ledger, "ABI end ledger");
    if (typeof abi.has_breaking_changes !== "boolean") {
      throw new Error("Deployment API returned an invalid ABI compatibility status.");
    }

    return {
      version: `v${versionNumber}`,
      validFromLedger: requiredNumber(abi.valid_from_ledger, "ABI start ledger"),
      validToLedger,
      hasBreakingChanges: abi.has_breaking_changes,
      breakingChangeDetails:
        typeof abi.breaking_change_details === "string" ? abi.breaking_change_details : "",
    };
  });
  const versionByLedger = new Map(
    versions.map((version) => [version.validFromLedger, version.version]),
  );
  const deployments: UpgradeEvent[] = requiredArray(response, "deployments").map((value, index) => {
    const deployment = asRecord(value);
    if (!deployment) {
      throw new Error("Deployment API returned an invalid deployment.");
    }
    if (typeof deployment.is_upgrade !== "boolean") {
      throw new Error("Deployment API returned an invalid deployment type.");
    }

    const ledger = requiredNumber(deployment.ledger_deployed, "deployment ledger");
    return {
      id: String(deployment.id ?? `${contractId}-${ledger}-${index}`),
      contract: contractId,
      type: deployment.is_upgrade ? "upgraded" : "deployed",
      version: versionByLedger.get(ledger) ?? "ABI version unavailable",
      timestamp: requiredString(deployment.detected_at, "deployment timestamp"),
      ledger,
      bytecodeHash: typeof deployment.bytecode_hash === "string" ? deployment.bytecode_hash : "",
      deployer:
        typeof deployment.deployer_address === "string" ? deployment.deployer_address : "",
      txHash: typeof deployment.tx_hash === "string" ? deployment.tx_hash : "",
      notes: typeof deployment.notes === "string" ? deployment.notes : "",
    };
  });
  const warnings: CompatibilityWarning[] = requiredArray(response, "compatibility_warnings").map((value, index) => {
    const warning = asRecord(value);
    if (!warning) {
      throw new Error("Deployment API returned an invalid compatibility warning.");
    }

    return {
      id: `${warning.abi_version ?? "abi"}-${index}`,
      version: `v${requiredNumber(warning.abi_version, "warning ABI version")}`,
      ledger: requiredNumber(warning.ledger, "warning ledger"),
      detail: requiredString(warning.detail, "compatibility warning"),
    };
  });

  return { contractId, deployments, versions, warnings };
}

function daysAgo(fromIso: string): number {
  const ms = Date.now() - new Date(fromIso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function exportAsJson(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export default function ContractUpgradeTimelinePage() {
  const [contractInput, setContractInput] = useState("");
  const [request, setRequest] = useState<TimelineRequest | null>(null);
  const [timeline, setTimeline] = useState<DeploymentTimeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<UpgradeStatus | "all">("all");
  const [timelineMode, setTimelineMode] = useState<"vertical" | "horizontal">("vertical");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [leftVersion, setLeftVersion] = useState("");
  const [rightVersion, setRightVersion] = useState("");

  useEffect(() => {
    const initialContractId = new URLSearchParams(window.location.search)
      .get("contract_id")
      ?.trim();
    if (initialContractId) {
      setContractInput(initialContractId);
      setRequest({ contractId: initialContractId });
    }
  }, []);

  useEffect(() => {
    if (!request) return;
    let active = true;
    const requestedContractId = request.contractId;

    async function loadTimeline() {
      setLoading(true);
      setError(null);
      setTimeline(null);
      try {
        const response = await authenticatedFetch(
          `${API_BASE}/api/ingest/contracts/${encodeURIComponent(requestedContractId)}/deployments/`,
          { cache: "no-store" },
        );
        if (response.status === 404) {
          throw new Error(`Contract not found: ${requestedContractId}`);
        }
        if (!response.ok) {
          throw new Error(`Failed to load deployment history (HTTP ${response.status}).`);
        }

        const result = adaptDeploymentTimeline(await response.json());
        if (active) {
          setTimeline(result);
          setSelectedEventId("");
          setLeftVersion("");
          setRightVersion("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load deployment history.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTimeline();
    return () => {
      active = false;
    };
  }, [request]);

  const filteredEvents = useMemo(() => {
    if (!timeline) return [];
    return timeline.deployments.filter((event) => {
      if (statusFilter !== "all" && event.type !== statusFilter) return false;
      const eventDate = new Date(event.timestamp).getTime();
      const from = fromDate ? new Date(`${fromDate}T00:00:00Z`).getTime() : Number.NEGATIVE_INFINITY;
      const to = toDate ? new Date(`${toDate}T23:59:59Z`).getTime() : Number.POSITIVE_INFINITY;
      return eventDate >= from && eventDate <= to;
    });
  }, [fromDate, statusFilter, timeline, toDate]);

  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0];
  const leftSnapshot =
    timeline?.versions.find((version) => version.version === leftVersion) ?? timeline?.versions[0];
  const rightSnapshot =
    timeline?.versions.find((version) => version.version === rightVersion) ??
    timeline?.versions[timeline.versions.length - 1];
  const latestDeployment = timeline?.deployments[timeline.deployments.length - 1];

  const submitContract = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const contractId = contractInput.trim();
    if (!contractId) {
      setTimeline(null);
      setRequest(null);
      setLoading(false);
      setError("Enter a contract ID to load its deployment history.");
      const url = new URL(window.location.href);
      url.searchParams.delete("contract_id");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("contract_id", contractId);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setError(null);
    setTimeline(null);
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
    setRequest({ contractId });
  };

  const retry = () => {
    if (request) setRequest({ contractId: request.contractId });
  };

  return (
    <main className="min-h-screen bg-terminal-black p-8 font-terminal-mono text-terminal-green">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs tracking-[0.2em] text-terminal-gray">
            [CONTRACT_UPGRADE_TIMELINE]
          </p>
          <h1 className="text-3xl">Contract Deployment and Upgrade History</h1>
          {latestDeployment && (
            <div className="inline-flex items-center gap-2 rounded border border-terminal-cyan/40 bg-terminal-cyan/10 px-3 py-1 text-xs text-terminal-cyan">
              <span className="h-2 w-2 rounded-full bg-terminal-cyan" />
              Latest deployment recorded {daysAgo(latestDeployment.timestamp)} days ago
            </div>
          )}
        </header>

        <form
          onSubmit={submitContract}
          className="flex flex-col gap-3 rounded border border-terminal-green/20 p-4 sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-xs text-terminal-gray">
            Contract ID
            <input
              aria-label="Contract ID"
              value={contractInput}
              onChange={(event) => setContractInput(event.target.value)}
              className="mt-1 w-full rounded border border-terminal-green/30 bg-terminal-black px-3 py-2 text-terminal-green"
              placeholder="Enter a contract ID"
            />
          </label>
          <button
            type="submit"
            className="rounded border border-terminal-cyan/40 px-4 py-2 text-sm text-terminal-cyan hover:bg-terminal-cyan/10"
          >
            Load timeline
          </button>
        </form>

        {loading ? (
          <div role="status" aria-busy="true" className="py-12 text-center text-terminal-cyan">
            Loading contract deployment history…
          </div>
        ) : error ? (
          <section role="alert" className="space-y-4 rounded border border-terminal-danger/30 p-6 text-center">
            <p>{error}</p>
            {request && (
              <button
                type="button"
                onClick={retry}
                className="rounded border border-terminal-green/30 px-3 py-2 text-sm"
              >
                Retry
              </button>
            )}
          </section>
        ) : !request ? (
          <section className="rounded border border-terminal-cyan/20 p-6 text-center text-sm text-terminal-gray">
            Enter a contract ID to view its deployment and ABI history.
          </section>
        ) : timeline ? (
          <>
            {timeline.warnings.length > 0 && (
              <section
                aria-label="Breaking ABI compatibility warnings"
                className="space-y-3 rounded border border-terminal-yellow/50 bg-terminal-yellow/5 p-4"
              >
                <h2 className="text-sm font-bold text-terminal-yellow">
                  Breaking ABI changes detected
                </h2>
                {timeline.warnings.map((warning) => (
                  <div key={warning.id} className="text-xs text-terminal-yellow">
                    <p className="font-bold">
                      {warning.version} · Ledger {warning.ledger}
                    </p>
                    <p>{warning.detail}</p>
                  </div>
                ))}
              </section>
            )}

            {timeline.deployments.length === 0 ? (
              <section
                data-testid="upgrade-empty-state"
                className="rounded border border-terminal-cyan/20 p-6 text-center text-sm text-terminal-gray"
              >
                No deployments found for contract {timeline.contractId}.
              </section>
            ) : (
              <>
                <section className="grid grid-cols-1 gap-3 rounded border border-terminal-green/20 p-4 md:grid-cols-4">
                  <label className="text-xs text-terminal-gray">
                    Status
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as UpgradeStatus | "all")}
                      className="mt-1 w-full rounded border border-terminal-green/30 bg-terminal-black px-2 py-2 text-terminal-green"
                    >
                      <option value="all">All</option>
                      <option value="deployed">Deployed</option>
                      <option value="upgraded">Upgraded</option>
                    </select>
                  </label>
                  <label className="text-xs text-terminal-gray">
                    From
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      className="mt-1 w-full rounded border border-terminal-green/30 bg-terminal-black px-2 py-2 text-terminal-green"
                    />
                  </label>
                  <label className="text-xs text-terminal-gray">
                    To
                    <input
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      className="mt-1 w-full rounded border border-terminal-green/30 bg-terminal-black px-2 py-2 text-terminal-green"
                    />
                  </label>
                  <div className="space-y-2">
                    <p className="text-xs text-terminal-gray">Export</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => exportAsJson(filteredEvents, "contract-upgrades.json")}
                        className="rounded border border-terminal-magenta/40 px-3 py-2 text-xs text-terminal-magenta hover:bg-terminal-magenta/10"
                      >
                        Export JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded border border-terminal-yellow/40 px-3 py-2 text-xs text-terminal-yellow hover:bg-terminal-yellow/10"
                      >
                        Export PDF
                      </button>
                    </div>
                  </div>
                </section>

                <section className="rounded border border-terminal-green/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm text-terminal-gray">Upgrade Timeline</h2>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setTimelineMode("vertical")}
                        className={`rounded border px-2 py-1 ${
                          timelineMode === "vertical"
                            ? "border-terminal-green text-terminal-green"
                            : "border-terminal-gray/40 text-terminal-gray"
                        }`}
                      >
                        Vertical
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimelineMode("horizontal")}
                        className={`rounded border px-2 py-1 ${
                          timelineMode === "horizontal"
                            ? "border-terminal-green text-terminal-green"
                            : "border-terminal-gray/40 text-terminal-gray"
                        }`}
                      >
                        Horizontal
                      </button>
                    </div>
                  </div>
                  {filteredEvents.length === 0 ? (
                    <p className="text-xs text-terminal-gray">No deployments match the selected filters.</p>
                  ) : (
                    <div
                      className={
                        timelineMode === "vertical"
                          ? "space-y-3"
                          : "grid grid-cols-1 gap-3 md:grid-cols-3"
                      }
                    >
                      {filteredEvents.map((upgradeEvent) => (
                        <article
                          key={upgradeEvent.id}
                          className="rounded border border-terminal-green/20 bg-black/30 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-terminal-cyan">
                              {new Date(upgradeEvent.timestamp).toLocaleString()}
                            </p>
                            <span className="rounded border border-terminal-green/30 px-2 py-0.5 text-[10px] uppercase">
                              {upgradeEvent.type}
                            </span>
                          </div>
                          <p className="mt-2 break-all text-sm">{upgradeEvent.contract}</p>
                          <p className="text-xs text-terminal-gray">Version: {upgradeEvent.version}</p>
                          <p className="text-xs text-terminal-gray">Ledger: {upgradeEvent.ledger}</p>
                          {upgradeEvent.bytecodeHash && (
                            <p className="mt-1 break-all text-xs text-terminal-gray">
                              Bytecode hash: {upgradeEvent.bytecodeHash}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedEventId(upgradeEvent.id)}
                            className="mt-3 rounded border border-terminal-cyan/40 px-2 py-1 text-xs text-terminal-cyan hover:bg-terminal-cyan/10"
                          >
                            View metadata
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <article className="rounded border border-terminal-cyan/20 p-4">
                    <h2 className="mb-3 text-sm text-terminal-cyan">Deployment Metadata</h2>
                    {selectedEvent ? (
                      <div className="space-y-2 break-all text-xs">
                        <p>Transaction hash: {selectedEvent.txHash || "Not recorded"}</p>
                        <p>Deployer: {selectedEvent.deployer || "Not recorded"}</p>
                        <p>Bytecode hash: {selectedEvent.bytecodeHash || "Not recorded"}</p>
                        <p>Ledger: {selectedEvent.ledger}</p>
                        <p>{selectedEvent.notes || "No deployment notes."}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-terminal-gray">No deployment selected for metadata view.</p>
                    )}
                  </article>

                  <article className="rounded border border-terminal-magenta/20 p-4">
                    <h2 className="mb-3 text-sm text-terminal-magenta">Contract ABI Versions</h2>
                    {timeline.versions.length === 0 ? (
                      <p className="text-xs text-terminal-gray">No ABI versions recorded.</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <select
                            aria-label="First ABI version"
                            value={leftSnapshot?.version ?? ""}
                            onChange={(event) => setLeftVersion(event.target.value)}
                            className="rounded border border-terminal-magenta/30 bg-terminal-black px-2 py-2 text-xs"
                          >
                            {timeline.versions.map((version) => (
                              <option key={version.version} value={version.version}>
                                {version.version}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label="Second ABI version"
                            value={rightSnapshot?.version ?? ""}
                            onChange={(event) => setRightVersion(event.target.value)}
                            className="rounded border border-terminal-magenta/30 bg-terminal-black px-2 py-2 text-xs"
                          >
                            {timeline.versions.map((version) => (
                              <option key={version.version} value={version.version}>
                                {version.version}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {[leftSnapshot, rightSnapshot].map((version, index) =>
                            version ? (
                              <div
                                key={`${version.version}-${index}`}
                                className={`rounded border p-3 text-xs ${
                                  version.hasBreakingChanges
                                    ? "border-terminal-yellow/60 bg-terminal-yellow/5"
                                    : "border-terminal-magenta/20"
                                }`}
                              >
                                <p className="font-bold">{version.version}</p>
                                <p>Valid from ledger: {version.validFromLedger}</p>
                                <p>
                                  Valid to ledger: {version.validToLedger ?? "Current"}
                                </p>
                                {version.hasBreakingChanges && (
                                  <p className="mt-2 font-bold text-terminal-yellow">
                                    BREAKING ABI CHANGE
                                    {version.breakingChangeDetails && `: ${version.breakingChangeDetails}`}
                                  </p>
                                )}
                              </div>
                            ) : null,
                          )}
                        </div>
                      </>
                    )}
                  </article>
                </section>
              </>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
