# @soroscan/sdk

> Official TypeScript/JavaScript client SDK for the [SoroScan](https://soroscan.io) API.

[![npm version](https://img.shields.io/npm/v/@soroscan/sdk.svg)](https://www.npmjs.com/package/@soroscan/sdk)
[![CI](https://github.com/SoroScan/soroscan/actions/workflows/sdk-ts.yml/badge.svg)](https://github.com/SoroScan/soroscan/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- 🔒 **Strict TypeScript** — full types for every request and response shape
- 📦 **Dual ESM / CJS** build — works in Node.js 18+, Vite, Next.js, and modern browsers
- 🚫 **Zero runtime dependencies** — only uses native `fetch`
- 🪝 **Full API coverage** — events, contracts, transactions, ledgers, accounts, webhooks

---

## Installation

```bash
npm install @soroscan/sdk
# or
yarn add @soroscan/sdk
# or
pnpm add @soroscan/sdk
```

---

## Quick Start

> See [QUICKSTART.md](QUICKSTART.md) for a step-by-step walkthrough.

```ts
import { SoroScanClient } from "@soroscan/sdk";

const client = new SoroScanClient({
  baseUrl: "https://api.soroscan.io",
  apiKey: process.env.SOROSCAN_API_KEY, // optional for public endpoints
});

// Fetch the 50 most recent "transfer" events for a contract
const events = await client.getEvents({
  contractId: "CCAAA...",
  eventType: "transfer",
  first: 50,
});

for (const event of events.items) {
  console.log(event.ledger, event.type, event.txHash);
}
```

### Promise-based usage

Every method returns a native `Promise`, so `async`/`await` and `.then()`/`.catch()` chaining both work:

```ts
client
  .getEvents({ contractId: "CCAAA...", first: 50 })
  .then((events) => events.items.forEach((e) => console.log(e.type, e.ledger)))
  .catch((err) => console.error("Failed to fetch events:", err));
```

---

## API Reference

### `new SoroScanClient(config)`

| Option | Type | Required | Description |
|---|---|---|---|
| `baseUrl` | `string` | ✅ | API base URL, e.g. `https://api.soroscan.io` |
| `apiKey` | `string` | — | API key sent as `Authorization: Bearer <key>` |
| `timeoutMs` | `number` | — | Request timeout in ms (default: `10_000`) |

---

### Events

#### `client.getEvents(params?)`

Returns a paginated list of contract events.

```ts
const result = await client.getEvents({
  contractId: "CCAAA...",   // filter by contract
  eventType: "transfer",    // filter by event type
  startLedger: 1_000_000,   // range filter
  endLedger:   1_001_000,
  first: 20,                // page size
  after: result.pageInfo.endCursor, // cursor pagination
});

// result: { items: ContractEvent[], pageInfo: PageInfo, totalCount: number }
```

**`GetEventsParams`**

| Field | Type | Description |
|---|---|---|
| `contractId` | `string` | Filter by contract address |
| `eventType` | `string` | e.g. `"transfer"`, `"mint"`, `"burn"` |
| `startLedger` | `number` | Minimum ledger sequence |
| `endLedger` | `number` | Maximum ledger sequence |
| `first` / `last` | `number` | Page size (max 200) |
| `after` / `before` | `string` | Cursor for pagination |

#### `client.getEventsByContracts(params)` (SC-23)

Fetch a single, ledger-ordered page of events across up to ten Soroban contracts.

```ts
const events = await client.getEventsByContracts({
  contractIds: ["CCAAA...", "CCBBB..."],
  eventType: "transfer",
  startLedger: 1_000_000,
  pageSize: 100,
});

for (const event of events.results) {
  console.log(event.contractId, event.type, event.ledger);
}
```

#### `client.recordStructuredEvent(params)` (SC-38)

Submit a versioned, deduplicated event. The `correlationId` makes retries safe — the contract rejects a repeated ID without publishing a second event.

```ts
const result = await client.recordStructuredEvent({
  contractId: "CCAAA...",
  eventType: "escrow",
  payloadHash: "a".repeat(64),
  schemaVersion: 1,
  correlationId: "b".repeat(64), // unique 32-byte hex id
});

console.log(result.status);            // "submitted" | "failed"
console.log(result.transactionStatus); // e.g. "SUCCESS"
```

**`RecordStructuredEventParams`**

| Field | Type | Description |
|---|---|---|
| `contractId` | `string` | Target contract address |
| `eventType` | `string` | Event category name |
| `payloadHash` | `string` | SHA-256 hex hash of the event payload |
| `schemaVersion` | `number` | Positive integer; selects the payload decoder |
| `correlationId` | `string` | 32-byte hex idempotency key |

#### `client.recordEventsBatch(params)` (SC-29)

Record up to 25 events in a single on-chain transaction.

```ts
const result = await client.recordEventsBatch({
  events: [
    { contractId: "CCAAA...", eventType: "transfer", payloadHash: "a".repeat(64) },
    { contractId: "CCAAA...", eventType: "swap",     payloadHash: "b".repeat(64) },
  ],
});

console.log("New total events:", result.totalEvents);
```

**`RecordEventsBatchParams`**

| Field | Type | Description |
|---|---|---|
| `events` | `EventEntry[]` | 1–25 entries; each has `contractId`, `eventType`, `payloadHash` |

---

### Contracts

#### `client.getContracts(params?)`

Returns a paginated list of deployed contracts.

```ts
const result = await client.getContracts({
  type: "token",
  verified: true,
  first: 10,
});
```

#### `client.getContract({ contractId })`

Returns details for a single contract.

```ts
const contract = await client.getContract({ contractId: "CCAAA..." });
console.log(contract.spec?.functions); // ABI
```

#### `client.getContractEvents(contractId, limit?)` (SC-16)

Returns up to `limit` recent events for a contract (default 100).

```ts
const events = await client.getContractEvents("CCAAA...", 20);

for (const event of events) {
  console.log(event.ledger, event.type, event.txHash);
}
```

| Parameter | Type | Description |
|---|---|---|
| `contractId` | `string` | Contract address |
| `limit` | `number` | Max events to return (default: `100`) |

#### `client.getContractRecentEvents(contractId, limit?)` (SC-30)

Returns the newest events for a contract, newest first. The limit is clamped to the server maximum of 20.

```ts
const recent = await client.getContractRecentEvents("CCAAA...", 10);

for (const event of recent) {
  console.log(event.ledger, event.type);
}
```

| Parameter | Type | Description |
|---|---|---|
| `contractId` | `string` | Contract address |
| `limit` | `number` | Max events to return, 1–20 (default: `10`) |

#### `client.getContractHealth(contractId)` (SC-16)

Returns the indexing health of a tracked contract.

```ts
const health = await client.getContractHealth("CCAAA...");

console.log("Status:", health.status);               // "healthy" | "unhealthy"
console.log("Failures:", health.consecutiveFailures);
console.log("Last event:", health.lastEventTime);
```

**`ContractHealth`**

| Field | Type | Description |
|---|---|---|
| `contractId` | `string` | Contract address |
| `status` | `string` | `"healthy"` or `"unhealthy"` |
| `lastEventTime` | `string \| null` | ISO timestamp of the last indexed event |
| `minutesSinceLastEvent` | `number \| null` | Minutes since the last event |
| `abiDecodeErrors1h` | `number` | ABI decode errors in the last hour |
| `consecutiveFailures` | `number` | Consecutive indexing failures |
| `errorMessage` | `string` | Error detail when unhealthy |
| `checkedAt` | `string \| null` | When health was last evaluated |

#### `client.getContractStatus()` (SC-28)

Returns the SoroScan contract's current pause state and total event count.

```ts
const status = await client.getContractStatus();

if (status.paused) {
  console.log("Paused. Admin:", status.admin);
} else {
  console.log("Active. Total events:", status.totalEvents);
}
```

**`ContractStatus`**

| Field | Type | Description |
|---|---|---|
| `paused` | `boolean` | Whether event recording is paused |
| `admin` | `string` | Current admin Stellar address |
| `totalEvents` | `number` | Total events recorded so far |

---

### Transactions

#### `client.getTransactions(params?)`

Returns a paginated list of transactions.

```ts
const result = await client.getTransactions({
  contractId: "CCAAA...",
  status: "success",
  first: 25,
});
```

#### `client.getTransaction(txHash)`

Returns a single transaction by hash.

```ts
const tx = await client.getTransaction("abc123...");
```

---

### Ledgers

#### `client.getLedgers(params?)`

Returns a paginated list of ledgers.

```ts
const result = await client.getLedgers({ first: 5 });
```

#### `client.getLedger(sequence)`

Returns a single ledger by sequence number.

```ts
const ledger = await client.getLedger(1_234_567);
```

---

### Accounts

#### `client.getAccount({ accountId })`

Returns account details including balances.

```ts
const account = await client.getAccount({ accountId: "GABC..." });
console.log(account.balances);
```

---

### Indexers & Admin

#### `client.addIndexer(params)` (SC-9)

Authorizes a Stellar address as an indexer on the SoroScan contract.

```ts
const result = await client.addIndexer({ indexerAddress: "GABC..." });

console.log(result.status);     // "submitted"
console.log(result.txHash);     // transaction hash or null
```

**`AddIndexerParams`**

| Field | Type | Description |
|---|---|---|
| `indexerAddress` | `string` | Stellar G... address to authorize |

#### `client.isIndexer(indexerAddress)` (SC-15)

Checks whether an address is a currently registered indexer.

```ts
const { is_indexer } = await client.isIndexer("GABC...");
console.log("Registered:", is_indexer); // true | false
```

#### `client.getAdmin()` (SC-15)

Returns the current SoroScan contract admin address.

```ts
const { admin_address } = await client.getAdmin();
console.log("Admin:", admin_address);
```

#### `client.getIndexerStats(indexer)` (SC-13)

Returns the total number of events recorded by a specific indexer.

```ts
const stats = await client.getIndexerStats("GABC...");

console.log("Indexer:", stats.indexer);
console.log("Events recorded:", stats.eventsRecorded);
```

---

### Webhooks

#### `client.subscribeWebhook(params)`

Creates a new webhook subscription. The returned `secret` is used to verify
incoming payloads via `HMAC-SHA256`.

```ts
const webhook = await client.subscribeWebhook({
  url: "https://myapp.com/webhook/soroscan",
  triggers: ["event.created", "transaction.success"],
  contractId: "CCAAA...",          // optional — scope to one contract
  secret: "my-shared-secret",      // optional — auto-generated if omitted
});

console.log("Webhook ID:", webhook.id);
console.log("Signing secret:", webhook.secret);
```

**Available triggers**

| Trigger | Fires when |
|---|---|
| `event.created` | A new contract event is indexed |
| `contract.deployed` | A new contract is deployed |
| `transaction.success` | A transaction succeeds |
| `transaction.failed` | A transaction fails |

#### `client.listWebhooks()`

Returns all webhooks for the authenticated API key.

#### `client.getWebhook(webhookId)`

Returns a single webhook.

#### `client.updateWebhook(webhookId, params)`

Updates a webhook's URL, triggers, or status.

```ts
await client.updateWebhook("wh_001", { status: "paused" });
```

#### `client.deleteWebhook(webhookId)`

Permanently deletes a webhook.

#### `client.testWebhook(webhookId)`

Triggers a synthetic test delivery to the webhook's target URL and returns immediately.

```ts
const result = await client.testWebhook("wh_001");
console.log(result.status); // "test_webhook_queued"
```

---

## Error Handling

All methods throw a `SoroScanError` on non-2xx responses.

```ts
import { SoroScanClient, SoroScanError } from "@soroscan/sdk";

try {
  const contract = await client.getContract({ contractId: "INVALID" });
} catch (err) {
  if (err instanceof SoroScanError) {
    console.error(`[${err.statusCode}] ${err.code}: ${err.message}`);
    // e.g. [404] NOT_FOUND: Contract not found
  }
}
```

`SoroScanError` properties:

| Property | Type | Description |
|---|---|---|
| `statusCode` | `number` | HTTP status code |
| `code` | `string` | Machine-readable error code from the API |
| `message` | `string` | Human-readable message |
| `details` | `object?` | Optional additional context |

---

## Pagination

All list methods return a `PaginatedResponse<T>` with cursor-based pagination:

```ts
let after: string | null = null;

do {
  const page = await client.getEvents({
    contractId: "CCAAA...",
    first: 100,
    ...(after ? { after } : {}),
  });

  for (const event of page.items) {
    process(event);
  }

  after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
} while (after);
```

### Paginating Events

For large event sets, iterate page by page using the `endCursor` token until the
API reports no further pages. This keeps memory usage flat regardless of how many
events match the query:

```ts
import { SoroScanClient, type ContractEvent } from "@soroscan/sdk";

const client = new SoroScanClient({ baseUrl: "https://api.soroscan.io" });

async function* paginateEvents(contractId: string): AsyncGenerator<ContractEvent> {
  let cursor: string | null = null;

  while (true) {
    const page = await client.getEvents({
      contractId,
      first: 200,
      ...(cursor ? { after: cursor } : {}),
    });

    for (const event of page.items) {
      yield event;
    }

    if (!page.pageInfo.hasNextPage) {
      break;
    }

    cursor = page.pageInfo.endCursor;
  }
}

// Consume the full, paginated event set
for await (const event of paginateEvents("CCAAA...")) {
  console.log(event.ledger, event.type, event.txHash);
}
```

If you prefer an explicit loop over the cursor token, the same traversal can be
written without a generator:

```ts
let cursor: string | null = null;

while (cursor !== null || cursor === null) {
  const page = await client.getEvents({
    contractId: "CCAAA...",
    first: 200,
    ...(cursor ? { after: cursor } : {}),
  });

  for (const event of page.items) {
    console.log(event.ledger, event.type, event.txHash);
  }

  if (!page.pageInfo.hasNextPage) {
    break;
  }

  cursor = page.pageInfo.endCursor;
}
```

### Paginator helper

The `Paginator` class wraps any list method and exposes `hasNextPage()`, `nextPage()`,
`previousPage()`, and `goToPage(n)` with automatic cursor/offset handling:
Use the stateful `Paginator` class to auto-manage cursors:

```ts
import { Paginator, SoroScanClient } from "@soroscan/sdk";

const client = new SoroScanClient({ baseUrl: "https://api.soroscan.io" });
const paginator = new Paginator(
  (params) => client.getEvents(params),
  { contractId: "CCAAA...", first: 20 }
);

const page1 = await paginator.nextPage();
if (paginator.hasNextPage()) {
  await paginator.nextPage();
}
await paginator.goToPage(3);
await paginator.previousPage();
```

  const page2 = await paginator.nextPage();
}
const page5 = await paginator.goToPage(5);

```

See also [`docs/react-hooks.md`](./docs/react-hooks.md) for Apollo-integrated React hooks.

---

## TypeScript Usage



/* … truncated 522 chars — edit only what you need near the top … */
