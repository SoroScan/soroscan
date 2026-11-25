/**
 * Helpers for the live event stream page (app/live/page.tsx).
 */
import type { ConnectionStatus as SocketStatus } from "@/src/hooks/useWebSocket";
import type { ConnectionStatus as BadgeStatus } from "@/src/components/ConnectionStatusBadge";

export interface StreamEvent {
  id: string;
  contractId: string;
  eventType: string;
  timestamp: string;
  ledgerSequence: number;
  txHash: string;
  topics: string[];
  payload: Record<string, unknown>;
}

/** Soroban contract IDs: "C" followed by 55 base32 characters. */
const CONTRACT_ID_RE = /^C[A-Z2-7]{55}$/;

export function isValidContractId(value: string): boolean {
  return CONTRACT_ID_RE.test(value.trim());
}

/**
 * Normalize a message from /ws/events/<contract>/. The backend publishes
 * {contract_id, event_type, payload, ledger, event_index, tx_hash, timestamp?};
 * the hook's older {id, ts, contract, type, data} shape is accepted too.
 */
export function toStreamEvent(raw: unknown): StreamEvent {
  const msg = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const receivedAt = typeof msg.received_at === "string" ? msg.received_at : "";
  const str = (...values: unknown[]) => {
    const found = values.find((v) => typeof v === "string" && v !== "");
    return typeof found === "string" ? found : "";
  };
  const contractId = str(msg.contract_id, msg.contract);
  const eventType = str(msg.event_type, msg.type) || "unknown";
  const ledgerSequence = Number(msg.ledger ?? msg.ledger_sequence ?? 0) || 0;
  const txHash = str(msg.tx_hash, msg.txHash);
  const payloadValue = msg.payload ?? msg.data;
  const payload =
    payloadValue && typeof payloadValue === "object" && !Array.isArray(payloadValue)
      ? (payloadValue as Record<string, unknown>)
      : { value: payloadValue ?? null };
  const id =
    str(msg.id) ||
    (txHash ? `${txHash}:${String(msg.event_index ?? 0)}` : `${contractId}:${ledgerSequence}:${String(msg.event_index ?? receivedAt)}`);
  return {
    id,
    contractId,
    eventType,
    timestamp: str(msg.timestamp, msg.ts, receivedAt) || new Date(0).toISOString(),
    ledgerSequence,
    txHash,
    topics: Array.isArray(msg.topics) ? msg.topics.map(String) : [eventType],
    payload,
  };
}

export function toBadgeStatus(status: SocketStatus): BadgeStatus {
  if (status === "CONNECTED") return "connected";
  if (status === "CONNECTING") return "reconnecting";
  return "offline";
}
