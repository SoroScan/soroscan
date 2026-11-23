/**
 * Client for `GET /api/ingest/transactions/{tx_id}/`: every indexed event in
 * one transaction, ordered by ledger and event index.
 */
import type { TimelineEventStatus, TransactionTimelineEvent } from "@/components/transaction-timeline/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Stellar transaction hashes are 32 bytes, hex-encoded. */
const TX_HASH_RE = /^[0-9a-f]{64}$/i;

export function isValidTxHash(value: string): boolean {
  return TX_HASH_RE.test(value.trim());
}

export interface TransactionEventApi {
  id: number | string;
  contract_id?: string;
  contract_name?: string;
  event_type: string;
  payload?: unknown;
  decoded_payload?: unknown;
  ledger?: number;
  event_index?: number;
  timestamp: string;
  tx_hash?: string;
  status?: string;
}

interface TransactionEventsResponse {
  transaction_id: string;
  event_count: number;
  events: TransactionEventApi[];
}

/** Chain confirmation status (re-org detection) -> timeline status. */
const STATUS_MAP: Record<string, TimelineEventStatus> = {
  CONFIRMED: "success",
  PENDING_REORG: "pending",
  ORPHANED: "error",
};

export function adaptTransactionEvent(api: TransactionEventApi, txHash: string): TransactionTimelineEvent {
  const contract = api.contract_name || api.contract_id;
  return {
    id: String(api.id),
    transactionId: api.tx_hash || txHash,
    eventType: api.event_type,
    title: contract ? `${api.event_type} on ${contract}` : api.event_type,
    timestamp: api.timestamp,
    status: STATUS_MAP[api.status ?? "CONFIRMED"] ?? "pending",
    contractId: api.contract_id,
    txHash: api.tx_hash || txHash,
    ledger: api.ledger,
    // The API does not record which event caused which, so none is implied.
    parentEventId: null,
    details: api.decoded_payload ?? api.payload,
  };
}

export async function fetchTransactionEvents(txHash: string): Promise<TransactionTimelineEvent[]> {
  const hash = txHash.trim().toLowerCase();
  const response = await fetch(`${API_BASE}/api/ingest/transactions/${encodeURIComponent(hash)}/`, {
    cache: "no-store",
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Failed to load transaction (HTTP ${response.status}).`);
  const body = (await response.json()) as TransactionEventsResponse;
  return (body.events ?? []).map((event) => adaptTransactionEvent(event, hash));
}
