export type TimelineBucketSize =
  | "ONE_DAY"
  | "ONE_HOUR"
  | "THIRTY_MINUTES"
  | "FIVE_MINUTES";

export interface ContractInfo {
  contractId: string;
  name: string;
}

export interface EventTypeCount {
  eventType: string;
  count: number;
}

export interface EventRecord {
  id: string;
  contractId: string;
  contractName: string;
  eventType: string;
  ledger: number;
  eventIndex: number;
  timestamp: string;
  txHash: string;
  payload: unknown;
  payloadHash?: string;
  schemaVersion?: string;
  validationStatus?: string;
}

export interface EventTimelineGroup {
  start: string;
  end: string;
  eventCount: number;
  eventTypeCounts: EventTypeCount[];
  events: EventRecord[];
}

export interface EventTimelineResult {
  contractId: string;
  bucketSize: TimelineBucketSize;
  since: string;
  until: string;
  totalEvents: number;
  groups: EventTimelineGroup[];
}

export type ExportFormat = "csv" | "json" | "parquet";

export interface ExplorerFilters {
  eventType: string;
  since: string;
  until: string;
}

export interface ExportFilters {
  eventTypes: string[];
  since: string | null;
  until: string | null;
}
