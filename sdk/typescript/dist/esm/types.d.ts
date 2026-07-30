export interface SoroScanClientConfig {
    /** Base URL of the SoroScan API, e.g. "https://api.soroscan.io" */
    baseUrl: string;
    /** Optional API key sent as Bearer token */
    apiKey?: string;
    /** Request timeout in milliseconds (default: 30_000) */
    timeoutMs?: number;
}
/** ISO-8601 date-time string */
export type ISODateString = string;
/** Stellar contract address (C…) */
export type ContractId = string;
/** Stellar account address (G…) or contract address (C…) */
export type StellarAddress = string;
export type Network = "mainnet" | "testnet" | "futurenet";
export type LedgerEntryType = "contract_data" | "contract_code" | "account" | "trustline" | "offer" | "data" | "claimable_balance" | "liquidity_pool";
export interface PageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
}
export interface PaginatedResponse<T> {
    items: T[];
    pageInfo: PageInfo;
    totalCount: number;
}
export type EventType = "transfer" | "mint" | "burn" | "approve" | "clawback" | "set_admin" | "set_authorized" | string;
export interface ContractEventTopic {
    type: string;
    value: string;
}
export interface ContractEvent {
    id: string;
    ledger: number;
    ledgerClosedAt: ISODateString;
    txHash: string;
    contractId: ContractId;
    type: EventType;
    topics: ContractEventTopic[];
    value: unknown;
    inSuccessfulContractCall: boolean;
    pagingToken: string;
}
export interface GetEventsParams {
    /** Filter by contract address */
    contractId?: ContractId;
    /** Filter by event type (e.g. "transfer") */
    eventType?: EventType;
    /** Filter events at or after this ledger */
    startLedger?: number;
    /** Filter events at or before this ledger */
    endLedger?: number;
    /** Cursor-based pagination — fetch records after this cursor */
    after?: string;
    /** Cursor-based pagination — fetch records before this cursor */
    before?: string;
    /** Number of records to return (max 200, default 20) */
    first?: number;
    /** Number of records to return from the end (max 200) */
    last?: number;
}
export type GetEventsResponse = PaginatedResponse<ContractEvent>;
export type ContractType = "token" | "nft" | "dex" | "lending" | "custom";
export interface ContractSpec {
    functions: ContractFunction[];
    types: ContractTypeDefinition[];
}
export interface ContractFunction {
    name: string;
    inputs: ContractFunctionParam[];
    outputs: ContractFunctionParam[];
    doc?: string;
}
export interface ContractFunctionParam {
    name: string;
    type: string;
}
export interface ContractTypeDefinition {
    name: string;
    kind: "struct" | "enum" | "union" | "error";
    fields?: ContractFunctionParam[];
}
export interface Contract {
    id: ContractId;
    network: Network;
    type: ContractType;
    wasmHash: string;
    creator: StellarAddress;
    createdAt: ISODateString;
    createdLedger: number;
    lastActivityAt: ISODateString | null;
    totalEvents: number;
    spec: ContractSpec | null;
    verified: boolean;
    verifiedAt: ISODateString | null;
    sourceCode: string | null;
    label: string | null;
}
export interface GetContractsParams {
    /** Filter by contract type */
    type?: ContractType;
    /** Filter by creator address */
    creator?: StellarAddress;
    /** Search label or contract ID (partial match) */
    search?: string;
    /** Show only verified contracts */
    verified?: boolean;
    after?: string;
    before?: string;
    first?: number;
    last?: number;
}
export type GetContractsResponse = PaginatedResponse<Contract>;
export interface GetContractParams {
    contractId: ContractId;
}
export type TransactionStatus = "success" | "failed" | "pending";
export interface Transaction {
    hash: string;
    ledger: number;
    createdAt: ISODateString;
    sourceAccount: StellarAddress;
    fee: string;
    status: TransactionStatus;
    operationCount: number;
    envelopeXdr: string;
    resultXdr: string;
    metaXdr: string;
    contractIds: ContractId[];
}
export interface GetTransactionsParams {
    contractId?: ContractId;
    account?: StellarAddress;
    status?: TransactionStatus;
    after?: string;
    before?: string;
    first?: number;
    last?: number;
}
export type GetTransactionsResponse = PaginatedResponse<Transaction>;
export interface Ledger {
    sequence: number;
    hash: string;
    closedAt: ISODateString;
    transactionCount: number;
    operationCount: number;
    totalFees: string;
    baseFee: number;
    baseReserve: number;
}
export interface GetLedgersParams {
    after?: string;
    before?: string;
    first?: number;
    last?: number;
}
export type GetLedgersResponse = PaginatedResponse<Ledger>;
export interface AccountBalance {
    assetType: "native" | "credit_alphanum4" | "credit_alphanum12";
    assetCode?: string;
    assetIssuer?: string;
    balance: string;
}
export interface Account {
    id: StellarAddress;
    sequence: string;
    balances: AccountBalance[];
    subentryCount: number;
    inflationDest: StellarAddress | null;
    homeDomain: string | null;
    lastModifiedLedger: number;
    lastModifiedAt: ISODateString;
    contractInteractions: number;
}
export interface GetAccountParams {
    accountId: StellarAddress;
}
export type WebhookTrigger = "event.created" | "contract.deployed" | "transaction.success" | "transaction.failed";
export type WebhookStatus = "active" | "paused" | "failed";
export interface Webhook {
    id: string;
    url: string;
    triggers: WebhookTrigger[];
    contractId: ContractId | null;
    status: WebhookStatus;
    secret: string;
    createdAt: ISODateString;
    lastDeliveredAt: ISODateString | null;
    failureCount: number;
}
export interface SubscribeWebhookParams {
    /** HTTPS endpoint that will receive POST notifications */
    url: string;
    /** One or more event triggers to subscribe to */
    triggers: WebhookTrigger[];
    /** Optionally scope notifications to a single contract */
    contractId?: ContractId;
    /** Shared secret used to sign webhook payloads (HMAC-SHA256) */
    secret?: string;
}
export interface UpdateWebhookParams {
    url?: string;
    triggers?: WebhookTrigger[];
    status?: "active" | "paused";
}
export interface WebhookListResponse {
    items: Webhook[];
    totalCount: number;
}
export interface EventSearchParams {
    /** Free-text substring match against JSON payload text */
    q?: string;
    /** Filter by contract address */
    contractId?: ContractId;
    /** Filter by event type */
    eventType?: EventType;
    /** JSON containment sub-string */
    payloadContains?: string;
    /** Dot-notation field path for field-level queries */
    payloadField?: string;
    /** Comparison operator: eq, neq, gte, lte, gt, lt, contains, startswith, in */
    payloadOp?: string;
    /** Value for field comparison */
    payloadValue?: string;
    /** Page number (1-indexed) */
    page?: number;
    /** Results per page (max 1000) */
    pageSize?: number;
}
export interface EventSearchResult {
    id: number;
    contract_id: string;
    contract_name: string;
    event_type: string;
    payload: Record<string, unknown>;
    payload_hash: string;
    ledger: number;
    event_index: number;
    timestamp: ISODateString;
    tx_hash: string;
    transaction_id: string;
    validation_status: string;
    signature_status: string;
    relevance_score: number;
}
export interface SearchResponse {
    count: number;
    page: number;
    page_size: number;
    results: EventSearchResult[];
}
export interface EventTypeStat {
    contract_id: string;
    event_type: string;
    count: number;
    first_seen: ISODateString;
    last_seen: ISODateString;
}
export interface EventTypeStatistics {
    contract_id: string | null;
    total_events: number;
    event_types: EventTypeStat[];
}
export interface EventEntry {
    /** Target contract address */
    contractId: ContractId;
    /** Event type name (e.g. "transfer", "swap") */
    eventType: EventType;
    /** SHA-256 hash of the event payload (hex) */
    payloadHash: string;
}
export interface RecordEventsBatchParams {
    /** 1–25 event entries to record in a single transaction */
    events: EventEntry[];
}
export interface RecordEventsBatchResponse {
    status: string;
    /** New total event count after the batch */
    totalEvents: number;
    txHash: string | null;
    transactionStatus: string | null;
    error: string | null;
}
export interface SoroScanApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map