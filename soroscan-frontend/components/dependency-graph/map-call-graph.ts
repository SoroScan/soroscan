// ── Live call-graph → ContractWithDeps mapper (#922) ──────────────────────────
//
// Translates the `dependenciesForContract(contractId)` GraphQL payload
// (`CallGraph.graphData`) into the store's `ContractWithDeps` shape so the
// existing ReactFlow graph, severity coloring and filters keep working.

import type { ContractWithDeps, DependencyType } from "./types";

/** Node shape persisted in `CallGraph.graph_data` (see ingest/tasks.py). */
export interface CallGraphNode {
  id: string;
  label?: string | null;
}

/** Edge shape persisted in `CallGraph.graph_data` (see ingest/tasks.py). */
export interface CallGraphEdge {
  from: string;
  to: string;
  weight?: number | null;
  risk_score?: number | null;
}

export interface CallGraphGraphData {
  nodes?: CallGraphNode[] | null;
  edges?: CallGraphEdge[] | null;
}

/** The subset of the `CallGraph` GraphQL type this mapper consumes. */
export interface CallGraphPayload {
  graphData?: CallGraphGraphData | null;
  hasCycles?: boolean | null;
  cycleDetails?: unknown;
}

function toCycleNodeSet(hasCycles: boolean | null | undefined, details: unknown): Set<string> {
  if (!hasCycles || !Array.isArray(details)) return new Set();
  return new Set(details.map((value) => String(value)));
}

/** Count distinct contracts reachable downstream from `startId`. */
function reachableCount(startId: string, adjacency: Map<string, Set<string>>): number {
  const visited = new Set<string>();
  const queue: string[] = [];
  for (const next of adjacency.get(startId) ?? []) queue.push(next);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (!visited.has(next)) queue.push(next);
    }
  }

  return visited.size;
}

/**
 * Map a `CallGraph` GraphQL payload into `ContractWithDeps[]`.
 *
 * - Each graph node becomes a contract (name = node label).
 * - Each edge becomes a `dependency` on the source and a `dependent` on the
 *   target; edges inside a detected cycle are marked `CIRCULAR`.
 * - `riskScore`/`reachabilityPct` are derived from the edge set.
 */
export function mapCallGraphToContracts(
  payload: CallGraphPayload | null | undefined,
): ContractWithDeps[] {
  const nodes = payload?.graphData?.nodes ?? [];
  const edges = payload?.graphData?.edges ?? [];
  if (nodes.length === 0) return [];

  const hasCycles = Boolean(payload?.hasCycles);
  const cycleNodes = toCycleNodeSet(payload?.hasCycles, payload?.cycleDetails);

  const byId = new Map<string, ContractWithDeps>();
  for (const node of nodes) {
    byId.set(node.id, {
      id: node.id,
      name: node.label || node.id,
      address: node.id,
      riskScore: 0,
      reachabilityPct: 0,
      vulnerabilities: [],
      dependencies: [],
      dependents: [],
    });
  }

  const adjacency = new Map<string, Set<string>>();

  for (const edge of edges) {
    const source = byId.get(edge.from);
    const target = byId.get(edge.to);
    if (!source || !target) continue;

    const dependencyType: DependencyType =
      hasCycles && cycleNodes.has(edge.from) && cycleNodes.has(edge.to)
        ? "CIRCULAR"
        : "DIRECT";

    source.dependencies.push({
      id: `${edge.from}->${edge.to}`,
      contractAddress: target.address,
      contractName: target.name,
      dependencyType,
    });
    target.dependents.push({
      id: `dependent:${edge.from}->${edge.to}`,
      contractAddress: source.address,
      contractName: source.name,
    });

    const edgeRisk = Number(edge.risk_score) || 0;
    source.riskScore = Math.max(source.riskScore, edgeRisk / 10);

    const neighbours = adjacency.get(edge.from) ?? new Set<string>();
    neighbours.add(edge.to);
    adjacency.set(edge.from, neighbours);
  }

  const total = byId.size;
  for (const contract of byId.values()) {
    const reachable = reachableCount(contract.id, adjacency);
    contract.reachabilityPct = total > 1 ? Math.round((reachable / (total - 1)) * 100) : 0;
  }

  return Array.from(byId.values());
}
