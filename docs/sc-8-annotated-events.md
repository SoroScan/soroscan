# SC-8 — Annotated Event Emission & Real-Time Event Streaming

**Status:** Implemented  
**Affects:** Soroban contract · Django backend · Python SDK · TypeScript SDK · CLI

---

## Overview

SC-8 extends SoroScan's event emission capabilities across all layers of the stack:

| Layer | What was added |
|---|---|
| Soroban contract | `emit_annotated_event`, `event_count_by_type`, `latest_annotated_by_type` |
| Django backend | `GET /api/ingest/events/stream/` (SSE) · `GET /api/ingest/events/count-by-type/` |
| Python SDK | `client.emit_annotated_event()` · `client.get_event_count_by_type()` · `client.stream_events()` |
| TypeScript SDK | `client.emitAnnotatedEvent()` · `client.getEventCountByType()` · `client.streamEvents()` |
| CLI | `soroscan events watch` · `soroscan events count-by-type` |

---

## Motivation

Before SC-8, every emitted event carried only an opaque `payload_hash`. Off-chain
indexers had no reliable way to know which ABI version to use to decode a payload
without a separate schema-registry call.

SC-8 adds a lightweight **`schema_version`** integer to the on-chain event record.
The version tag travels with every annotated event so decoders can be selected
immediately, without additional round-trips.

SC-8 also ships the first **server-sent events (SSE) stream endpoint**, allowing
developers to tail live contract events from a terminal or browser with zero
WebSocket infrastructure.

---

## On-Chain Contract Changes

### New Types

```rust
/// An annotated event record carrying an explicit schema version tag (SC-8).
pub struct AnnotatedEventRecord {
    pub contract_id: Address,
    pub event_type:  Symbol,
    pub payload_hash: BytesN<32>,
    pub ledger:       u32,
    pub timestamp:    u64,
    pub schema_version: u32,   // ← NEW: must be ≥ 1
}
```

### New Error Code

| Code | Value | Meaning |
|---|---|---|
| `InvalidSchemaVersion` | `6` | `schema_version == 0` was passed; version 0 is reserved |

### New Functions

#### `emit_annotated_event`

```rust
pub fn emit_annotated_event(
    env: Env,
    indexer: Address,
    contract_id: Address,
    event_type: Symbol,
    payload_hash: BytesN<32>,
    schema_version: u32,   // ≥ 1
) -> Result<u64, ContractError>
```

- Validates `schema_version ≥ 1` — rejects with `InvalidSchemaVersion` otherwise.
- Increments the global event counter (shared with `record_event`).
- Updates an on-chain **per-type counter map** (`type_counts`).
- Stores the latest `AnnotatedEventRecord` under a composite key `(ann, event_type)`.
- Publishes an on-chain event with topics `("ann", event_type)` — distinguishable
  from plain `("soroscan", event_type)` events by the `"ann"` prefix.

#### `event_count_by_type`

```rust
pub fn event_count_by_type(env: Env, event_type: Symbol) -> u64
```

Returns the number of times a specific event type has been recorded via
`emit_annotated_event`. Returns `0` for unknown types.

#### `latest_annotated_by_type`

```rust
pub fn latest_annotated_by_type(env: Env, event_type: Symbol) -> Option<AnnotatedEventRecord>
```

Returns the most recently stored `AnnotatedEventRecord` for a type, or `None`.

---

## Backend API Changes

### `GET /api/ingest/events/count-by-type/`

Returns per-event-type counts from the PostgreSQL `ContractEvent` table.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `contract_id` | string | Filter to a single contract address (optional) |
| `include_schema_versions` | bool | Add per-`schema_version` sub-counts (default `false`) |

**Example response**

```json
{
  "contract_id": "CCAAA...",
  "total_events": 15,
  "counts": [
    {
      "event_type": "swap",
      "count": 10,
      "schema_versions": [
        { "schema_version": 1, "count": 7 },
        { "schema_version": 2, "count": 3 }
      ]
    },
    { "event_type": "transfer", "count": 5 }
  ]
}
```

Results are cached for 60 seconds. The `schema_versions` array is only present
when `include_schema_versions=true` is passed.

---

### `GET /api/ingest/events/stream/`

Opens a long-lived HTTP connection and pushes new `ContractEvent` rows as
**Server-Sent Events**. The server closes the connection after 60 seconds;
clients should reconnect using the `id` of the last received event as `since_id`.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `contract_id` | string | Filter stream to a single contract (optional) |
| `event_type` | string | Filter stream to a specific event type (optional) |
| `since_id` | integer | Resume from events with `id > N` (default: latest) |

**SSE frame types**

| `event:` name | When emitted | Data fields |
|---|---|---|
| `connected` | On open | `cursor`, `ts` |
| `event` | Every new `ContractEvent` row | Full event object (see below) |
| `stream_end` | Before server closes | `type`, `reason` |
| `: ping` | Every 15 s | Comment line (keep-alive) |

**Event data object**

```json
{
  "id": 1234,
  "contract_id": "CCAAA...",
  "contract_name": "Token Contract",
  "event_type": "transfer",
  "payload": { "amount": 500 },
  "ledger": 12345,
  "event_index": 0,
  "tx_hash": "abc...",
  "timestamp": "2026-07-01T10:00:00+00:00",
  "schema_version": 2,
  "validation_status": "passed",
  "signature_status": "valid"
}
```

**Response headers**

```
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no
```

---

## Python SDK

### `emit_annotated_event()`

```python
from soroscan import SoroScanClient

with SoroScanClient(base_url="https://api.soroscan.io", api_key="...") as client:
    result = client.emit_annotated_event(
        contract_id="CCAAA...",
        event_type="transfer",
        payload_hash="sha256hexdigest...",
        schema_version=2,          # must be >= 1
    )
    print(result.total_events)     # new global event count
```

### `get_event_count_by_type()`

```python
counts = client.get_event_count_by_type(
    contract_id="CCAAA...",
    include_schema_versions=True,
)
for entry in counts.counts:
    print(entry.event_type, entry.count, entry.schema_versions)
```

### `stream_events()` (synchronous generator)

```python
cursor = 0
while True:
    for ev in client.stream_events(
        contract_id="CCAAA...",
        event_type="swap",
        since_id=cursor,
    ):
        print(ev.event_type, ev.ledger, ev.schema_version)
        cursor = ev.id   # advance cursor for reconnect
    # server closed — the loop reconnects automatically
    import time; time.sleep(2)
```

### New models

| Class | Description |
|---|---|
| `EmitAnnotatedEventRequest` | Request body for `emit_annotated_event` |
| `EmitAnnotatedEventResponse` | Response — includes `total_events` |
| `EventCountByTypeResponse` | Top-level response from count-by-type endpoint |
| `EventTypeCountEntry` | Single entry with `event_type`, `count`, optional `schema_versions` |
| `StreamedEvent` | A single event frame from the SSE stream |

---

## TypeScript SDK

### `emitAnnotatedEvent()`

```typescript
const result = await client.emitAnnotatedEvent({
  contractId: 'CCAAA...',
  eventType: 'transfer',
  payloadHash: 'sha256hexdigest...',
  schemaVersion: 2,          // must be >= 1
});
console.log('total events:', result.totalEvents);
```

### `getEventCountByType()`

```typescript
const data = await client.getEventCountByType({
  contractId: 'CCAAA...',
  includeSchemaVersions: true,
});
for (const entry of data.counts) {
  console.log(entry.eventType, entry.count, entry.schemaVersions);
}
```

### `streamEvents()` (async generator)

```typescript
let cursor = 0;
while (true) {
  for await (const ev of client.streamEvents({
    contractId: 'CCAAA...',
    sinceId: cursor,
  })) {
    console.log(ev.type, ev.ledger, ev.schemaVersion);
    cursor = ev.id;
  }
  // server closed — wait before reconnecting
  await new Promise(r => setTimeout(r, 2000));
}
```

Pass an `AbortSignal` to stop the stream programmatically:

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 30_000);

for await (const ev of client.streamEvents({ signal: controller.signal })) {
  console.log(ev);
}
```

---

## CLI

### `soroscan events watch`

Stream events in real time from a terminal. Reconnects automatically.

```bash
soroscan events watch
soroscan events watch --contract CCAAA... --event-type swap
soroscan events watch --contract CCAAA... --output json
soroscan events watch --since-id 1000   # resume from a specific cursor
```

Press **Ctrl-C** to stop.

### `soroscan events count-by-type`

Show per-event-type counts.

```bash
soroscan events count-by-type
soroscan events count-by-type --contract CCAAA...
soroscan events count-by-type --contract CCAAA... --schema-versions
soroscan events count-by-type --output json
```

---

## Testing

### Soroban contract (`cargo test`)

8 new tests added to `soroban-contracts/soroscan_core/src/lib.rs`:

| Test | What it verifies |
|---|---|
| `test_emit_annotated_event_basic` | Happy path — record stored, count incremented, latest query |
| `test_emit_annotated_event_invalid_schema_version` | `schema_version=0` → `InvalidSchemaVersion` |
| `test_emit_annotated_event_unauthorized_indexer` | Non-whitelisted indexer → `IndexerNotFound` |
| `test_emit_annotated_event_increments_type_count` | Per-type counter accuracy across multiple types |
| `test_emit_annotated_event_publishes_ann_topic` | On-chain event has `"ann"` as first topic |
| `test_event_count_by_type_no_events` | Returns `0` before any events without panic |
| `test_latest_annotated_by_type_none_before_emit` | Returns `None` before first emit |
| `test_annotated_and_plain_events_coexist` | `record_event` and `emit_annotated_event` share counter but use separate storage |

Run with:

```bash
cd soroban-contracts/soroscan_core
cargo test
```

### Django backend (`pytest`)

15 new tests in `django-backend/soroscan/ingest/tests/test_sc8_views.py`:

- **`TestEventCountByTypeView`** (8 tests): empty response, all-types count, contract filter, 404 for unknown contract, `schema_versions` inclusion, default exclusion, ordering, false-y flag values
- **`TestEventStreamView`** (7 tests): content-type header, `connected` frame, event inclusion by `since_id`, contract filter, event-type filter, required field presence, invalid `since_id` graceful default, `X-Accel-Buffering` header

Run with:

```bash
cd django-backend
pytest soroscan/ingest/tests/test_sc8_views.py -v
```

### Python SDK (`pytest`)

29 new tests in `sdk/python/tests/test_sc8.py`:

- Model validation (request, response, streaming)
- Client method correctness (HTTP body, params forwarding, error propagation)
- SSE frame parsing (happy path, skip non-event frames, skip malformed data)
- CLI subcommand routing and output format

Run with:

```bash
cd sdk/python
pytest tests/test_sc8.py -v
```

### TypeScript SDK (Vitest)

22 new tests in `sdk/typescript/test/sc8-annotated.test.ts`:

- `emitAnnotatedEvent` — happy path, 400/401 errors, error field
- `getEventCountByType` — no params, contract filter, `include_schema_versions`, empty, 404
- `streamEvents` — yields events, skips non-event frames, query params, 401 error, malformed data
- Type-export smoke tests

Run with:

```bash
cd sdk/typescript
npx vitest run test/sc8-annotated.test.ts
```

---

## Breaking Changes

None. All additions are backward-compatible:

- The new contract functions (`emit_annotated_event`, `event_count_by_type`, `latest_annotated_by_type`) are additive — existing `record_event` and `record_events_batch` callers are unaffected.
- The new API endpoints are at new URL paths.
- SDK `__version__` was bumped from `0.2.0` to `0.3.0` (minor version — no breaking changes).
- The `InvalidSchemaVersion` error code (`6`) is new and does not conflict with existing codes.

---

## Related

- SC-29 — Batch event recording (already shipped)
- Roadmap item: "Real-time WS Subscriptions" — the SSE stream in SC-8 is the
  first step toward that goal; a full WebSocket upgrade path is planned for v1.2.
