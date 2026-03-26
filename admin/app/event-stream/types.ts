// Event Stream Types

export interface StreamEvent {
  id: string; // local uuid for React key
  event_id?: number;
  contract_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  ledger: number;
  timestamp: string;
  tx_hash: string;
}

export interface StreamFilters {
  contractId: string;
  eventType: string;
  since: string; // ISO date string or ''
  until: string; // ISO date string or ''
}

export interface Contract {
  id: number;
  contract_id: string;
  name: string;
}

export const MAX_EVENTS = 500; // cap in-memory buffer
