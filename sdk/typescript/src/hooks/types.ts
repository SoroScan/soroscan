import type { ContractEvent, Contract, Webhook } from "../types.js";

/** Shared async state returned by SDK React hooks. */
export interface HookState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
}

export interface UseEventsOptions {
  /** Soroban contract id to filter events. */
  contractId: string;
  /** Optional event type filter. */
  eventType?: string;
  /** Page size for the initial GraphQL query (default 20). */
  first?: number;
  /** Subscribe to live events via GraphQL (default false). */
  subscribe?: boolean;
  /** Skip fetching when true. */
  skip?: boolean;
}

export interface UseEventsResult extends HookState<ContractEvent[]> {
  /** Latest event from the subscription, if enabled. */
  latestEvent: ContractEvent | undefined;
  refetch: () => void;
  fetchMore: () => Promise<void>;
  hasNextPage: boolean;
}

export interface UseContractOptions {
  contractId: string;
  skip?: boolean;
}

export type UseContractResult = HookState<Contract> & {
  refetch: () => void;
};

export interface UseWebhookOptions {
  contractId?: string;
  skip?: boolean;
}

export interface UseWebhookResult extends HookState<Webhook[]> {
  refetch: () => void;
  subscribe: (params: {
    targetUrl: string;
    eventType?: string;
    secret?: string;
  }) => Promise<Webhook>;
  remove: (webhookId: string) => Promise<void>;
  mutating: boolean;
  mutationError: Error | undefined;
}

/** GraphQL event node shape from the SoroScan backend. */
export interface GraphQLEventNode {
  id: string;
  eventType: string;
  contractId: string;
  contractName?: string;
  payload: Record<string, unknown>;
  ledger: number;
  eventIndex: number;
  timestamp: string;
  txHash: string;
}

/** GraphQL contract node shape from the SoroScan backend. */
export interface GraphQLContractNode {
  id: string;
  contractId: string;
  name: string;
  alias?: string | null;
  description?: string | null;
  isActive: boolean;
  lastEventAt?: string | null;
  eventCount?: number;
  createdAt?: string;
}

export function mapGraphQLEvent(node: GraphQLEventNode): ContractEvent {
  return {
    id: String(node.id),
    contractId: node.contractId,
    type: node.eventType,
    ledger: node.ledger,
    ledgerClosedAt: node.timestamp,
    txHash: node.txHash,
    topics: [],
    value: node.payload,
    inSuccessfulContractCall: true,
    pagingToken: String(node.id),
  };
}

export function mapGraphQLContract(node: GraphQLContractNode): Contract {
  return {
    id: node.contractId,
    network: "testnet",
    type: "custom",
    wasmHash: "",
    creator: "",
    createdAt: node.createdAt ?? new Date(0).toISOString(),
    createdLedger: 0,
    lastActivityAt: node.lastEventAt ?? null,
    totalEvents: node.eventCount ?? 0,
    spec: null,
    verified: false,
    verifiedAt: null,
    sourceCode: null,
    label: node.name,
  };
}
