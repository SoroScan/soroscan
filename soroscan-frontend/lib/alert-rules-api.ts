/**
 * Client for the alert rules REST API (`/api/ingest/alert-rules/`).
 *
 * A rule fires once per indexed event whose data matches its `condition`
 * (a JSON AST evaluated by the backend), and notifies every channel.
 */
import { authenticatedFetch } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const RULES_URL = `${API_BASE}/api/ingest/alert-rules/`;

export type ChannelType = "slack" | "email" | "webhook";
export const CHANNEL_TYPES: ChannelType[] = ["slack", "email", "webhook"];

export type ComparisonOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains";

export interface AlertChannel {
  type: ChannelType;
  target: string;
}

export interface ConditionNode {
  op: string;
  field?: string;
  value?: unknown;
  conditions?: ConditionNode[];
  condition?: ConditionNode;
}

export interface AlertRule {
  id: number;
  contract: number;
  contractId: string;
  name: string;
  condition: ConditionNode;
  channels: AlertChannel[];
  isActive: boolean;
  createdAt: string;
}

export interface AlertExecution {
  id: number;
  eventType: string;
  ledger: number | null;
  channel: string;
  status: "sent" | "failed";
  response: string;
  createdAt: string;
}

export interface ContractOption {
  id: number;
  name: string;
  contractId: string;
}

/** What the rule editor produces. */
export interface RuleDraft {
  contract: number;
  name: string;
  /** Event type to match, or "" for any event type. */
  eventType: string;
  /** Optional payload comparison, e.g. payload.amount >= 1000. */
  field: string;
  op: ComparisonOp;
  value: string;
  channels: AlertChannel[];
}

// ── API shapes ────────────────────────────────────────────────────────────────

interface AlertRuleApi {
  id: number;
  contract: number;
  contract_id?: string;
  name: string;
  condition: ConditionNode;
  channels?: AlertChannel[] | null;
  action_type: ChannelType;
  action_target?: string;
  is_active: boolean;
  created_at: string;
}

interface AlertExecutionApi {
  id: number;
  event_type?: string;
  ledger?: number | null;
  channel?: string;
  status: "sent" | "failed";
  response?: string;
  created_at: string;
}

interface ContractApi {
  id: number;
  name?: string;
  contract_id: string;
}

// ── Adapters ──────────────────────────────────────────────────────────────────

export function adaptRule(api: AlertRuleApi): AlertRule {
  const channels =
    api.channels && api.channels.length > 0
      ? api.channels
      : api.action_target
        ? [{ type: api.action_type, target: api.action_target }]
        : [];
  return {
    id: api.id,
    contract: api.contract,
    contractId: api.contract_id ?? "",
    name: api.name,
    condition: api.condition,
    channels,
    isActive: api.is_active,
    createdAt: api.created_at,
  };
}

export function adaptExecution(api: AlertExecutionApi): AlertExecution {
  return {
    id: api.id,
    eventType: api.event_type ?? "",
    ledger: api.ledger ?? null,
    channel: api.channel ?? "",
    status: api.status,
    response: api.response ?? "",
    createdAt: api.created_at,
  };
}

function parseValue(raw: string): string | number | boolean {
  const trimmed = raw.trim();
  if (trimmed === "true" || trimmed === "false") return trimmed === "true";
  if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  return trimmed;
}

/** Build the backend condition AST from the editor fields. */
export function buildCondition(draft: Pick<RuleDraft, "eventType" | "field" | "op" | "value">): ConditionNode {
  const conditions: ConditionNode[] = [];
  if (draft.eventType.trim()) {
    conditions.push({ op: "eq", field: "event_type", value: draft.eventType.trim() });
  }
  if (draft.field.trim()) {
    conditions.push({ op: draft.op, field: draft.field.trim(), value: parseValue(draft.value) });
  }
  if (conditions.length === 1) return conditions[0];
  return { op: "and", conditions };
}

/** Human-readable summary of a condition AST. */
export function describeCondition(node: ConditionNode): string {
  const op = (node.op || "").toLowerCase();
  if (op === "and" || op === "or") {
    return (node.conditions ?? []).map(describeCondition).join(` ${op.toUpperCase()} `);
  }
  if (op === "not" && node.condition) return `NOT (${describeCondition(node.condition)})`;
  const symbols: Record<string, string> = { eq: "=", neq: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=" };
  return `${node.field} ${symbols[op] ?? op} ${JSON.stringify(node.value)}`;
}

export function draftToPayload(draft: RuleDraft) {
  const channels = draft.channels.filter((c) => c.target.trim());
  return {
    contract: draft.contract,
    name: draft.name.trim(),
    condition: buildCondition(draft),
    channels,
    action_type: channels[0]?.type ?? "webhook",
    action_target: channels[0]?.target ?? "",
  };
}

// ── Requests ──────────────────────────────────────────────────────────────────

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

/** Turn a DRF error body ({field: [msg]} or {detail}) into one message. */
async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    if (typeof body.detail === "string") return body.detail;
    const parts = Object.entries(body).map(([key, value]) => {
      const text = Array.isArray(value) ? value.join(" ") : typeof value === "object" ? JSON.stringify(value) : String(value);
      return `${key}: ${text}`;
    });
    if (parts.length) return parts.join("; ");
  } catch {
    // not JSON
  }
  return `${fallback} (HTTP ${response.status}).`;
}

async function request(url: string, init: RequestInit, fallback: string): Promise<Response> {
  const response = await authenticatedFetch(url, { cache: "no-store", ...init });
  if (!response.ok) throw new Error(await errorMessage(response, fallback));
  return response;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function fetchAlertRules(): Promise<AlertRule[]> {
  const response = await request(RULES_URL, {}, "Failed to load alert rules");
  return unwrapList<AlertRuleApi>(await response.json()).map(adaptRule);
}

export async function fetchContracts(): Promise<ContractOption[]> {
  const response = await request(`${API_BASE}/api/ingest/contracts/`, {}, "Failed to load contracts");
  return unwrapList<ContractApi>(await response.json()).map((c) => ({
    id: c.id,
    name: c.name || c.contract_id,
    contractId: c.contract_id,
  }));
}

export async function createAlertRule(draft: RuleDraft): Promise<AlertRule> {
  const response = await request(RULES_URL, jsonInit("POST", draftToPayload(draft)), "Failed to create alert rule");
  return adaptRule((await response.json()) as AlertRuleApi);
}

export async function setAlertRuleActive(id: number, isActive: boolean): Promise<AlertRule> {
  const response = await request(`${RULES_URL}${id}/`, jsonInit("PATCH", { is_active: isActive }), "Failed to update alert rule");
  return adaptRule((await response.json()) as AlertRuleApi);
}

export async function deleteAlertRule(id: number): Promise<void> {
  await request(`${RULES_URL}${id}/`, { method: "DELETE" }, "Failed to delete alert rule");
}

export async function fetchAlertExecutions(id: number): Promise<AlertExecution[]> {
  const response = await request(`${RULES_URL}${id}/executions/`, {}, "Failed to load alert history");
  return unwrapList<AlertExecutionApi>(await response.json()).map(adaptExecution);
}
