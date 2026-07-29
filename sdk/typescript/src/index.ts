export { SoroScanClient, SoroScanError, Paginator } from "./client.js";
export { verifyWebhookSignature } from "./webhookVerification.js";
export type {
  // Config
  SoroScanClientConfig,
  // Shared
  ISODateString,
  ContractId,
  StellarAddress,
  Network,
  LedgerEntryType,
  PageInfo,
  PaginatedResponse,
  // Events
  EventType,
  ContractEventTopic,
  ContractEvent,
  GetEventsParams,
  GetEventsResponse,
  // Contracts
  ContractType,
  ContractSpec,
  ContractFunction,
  ContractFunctionParam,
  ContractTypeDefinition,
  Contract,
  GetContractsParams,
  GetContractsResponse,
  GetContractParams,
  // Transactions
  TransactionStatus,
  Transaction,
  GetTransactionsParams,
  GetTransactionsResponse,
  // Ledgers
  Ledger,
  GetLedgersParams,
  GetLedgersResponse,
  // Accounts
  AccountBalance,
  Account,
  GetAccountParams,
  // Webhooks
  WebhookTrigger,
  WebhookStatus,
  Webhook,
  SubscribeWebhookParams,
  UpdateWebhookParams,
  WebhookListResponse,
  // SC-29: Batch event recording
  EventEntry,
  RecordEventsBatchParams,
  RecordEventsBatchResponse,
  // SC-8: Annotated event emission & per-type counts
  EmitAnnotatedEventParams,
  EmitAnnotatedEventResponse,
  GetEventCountByTypeParams,
  EventCountByTypeResponse,
  EventTypeCountEntry,
  StreamedEvent,
  StreamEventsParams,
  // Errors
  SoroScanApiError,
} from "./types.js";