# Python SDK

The **SoroScan Python SDK** is the official library for integrating SoroScan into your Python applications. It supports
both synchronous and asynchronous operations and is fully type-hinted.

## Installation

```bash
pip install soroscan-sdk
```

This also installs the `soroscan` CLI for querying events, webhooks, and contracts locally.

## CLI

```bash
export SOROSCAN_API_KEY="your-api-key"
export SOROSCAN_BASE_URL="https://api.soroscan.io"

soroscan events --contract ABC123 --event-type transfer --limit 10
soroscan webhooks list
soroscan webhooks test 1
soroscan contracts list --output json
```

Use `--output table` (default) or `--output json`. Point `--base-url` at a local SoroScan instance when developing
against a self-hosted stack.

## Basic Usage

### Synchronous Client

```python
from soroscan import SoroScanClient

client = SoroScanClient(
    base_url="https://api.soroscan.io",
    api_key="your-api-key"
)

# Fetch events for a specific contract
events = client.get_events(
    contract_id="CCAAA...",
    event_type="transfer",
    first=50
)

for event in events.items:
    print(f"Ledger: {event.ledger} | Type: {event.event_type}")
```

### Asynchronous Client

```python
import asyncio
from soroscan import AsyncSoroScanClient

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        stats = await client.get_contract_stats("CCAAA...")
        print(f"Total Events: {stats.total_events}")

asyncio.run(main())
```

## Indexer and Contract Operations

The client also exposes contract authorization, status, recent-event, and event-submission operations. Each method is
available on both `SoroScanClient` and `AsyncSoroScanClient`; the async form has the same arguments and return model
and must be awaited.

### Authorize an Indexer

`add_indexer` submits a Stellar address for authorization (SC-9). It returns an `AddIndexerResponse` with `status`,
optional `tx_hash`, `transaction_status`, and `error`. `indexer_address` is limited to 56 characters.

```python
import asyncio

from soroscan import AsyncSoroScanClient, SoroScanClient

indexer_address = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"

with SoroScanClient(base_url="https://api.soroscan.io", api_key="your-api-key") as client:
    result = client.add_indexer(indexer_address)
    print(result.status, result.tx_hash)

async def main():
    async with AsyncSoroScanClient(
        base_url="https://api.soroscan.io", api_key="your-api-key"
    ) as client:
        result = await client.add_indexer(indexer_address)
        print(result.status, result.tx_hash)

asyncio.run(main())
```

Signature: `add_indexer(indexer_address: str) -> AddIndexerResponse`.

### Check Indexer Authorization

`is_indexer` checks whether a Stellar address is authorized and returns `IsIndexerResponse.is_indexer`.

```python
import asyncio

from soroscan import AsyncSoroScanClient, SoroScanClient

indexer_address = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"

with SoroScanClient(base_url="https://api.soroscan.io") as client:
    result = client.is_indexer(indexer_address)
    print(result.is_indexer)

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        result = await client.is_indexer(indexer_address)
        print(result.is_indexer)

asyncio.run(main())
```

Signature: `is_indexer(indexer_address: str) -> IsIndexerResponse`.

### Get the Contract Admin

`get_admin` returns `GetAdminResponse`; `admin_address` is a string or `None` when no admin is set.

```python
import asyncio

from soroscan import AsyncSoroScanClient, SoroScanClient

with SoroScanClient(base_url="https://api.soroscan.io") as client:
    result = client.get_admin()
    print(result.admin_address)

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        result = await client.get_admin()
        print(result.admin_address)

asyncio.run(main())
```

Signature: `get_admin() -> GetAdminResponse`.

### Get Contract Status

`get_contract_status` returns the contract's pause and activity data in a `ContractStatus`: `paused`, `admin`, and
`total_events`.

```python
import asyncio

from soroscan import AsyncSoroScanClient, SoroScanClient

with SoroScanClient(base_url="https://api.soroscan.io") as client:
    status = client.get_contract_status()
    print(status.paused, status.admin, status.total_events)

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        status = await client.get_contract_status()
        print(status.paused, status.admin, status.total_events)

asyncio.run(main())
```

Signature: `get_contract_status() -> ContractStatus`.

### Get Recent Contract Events

`get_contract_recent_events` returns a list of `ContractEvent` objects ordered newest first. `limit` defaults to 10
and must be between 1 and 20.

```python
import asyncio

from soroscan import AsyncSoroScanClient, SoroScanClient

contract_id = "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF"

with SoroScanClient(base_url="https://api.soroscan.io") as client:
    events = client.get_contract_recent_events(contract_id, limit=5)
    print([event.event_type for event in events])

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        events = await client.get_contract_recent_events(contract_id, limit=5)
        print([event.event_type for event in events])

asyncio.run(main())
```

Signature: `get_contract_recent_events(contract_id: str, limit: int = 10) -> list[ContractEvent]`.

Raises `ValueError` if `limit` is outside 1–20.

### Get Indexer Statistics

`get_indexer_stats` returns an `IndexerStats` with the queried `indexer` address and its `events_recorded` count.

```python
import asyncio

from soroscan import AsyncSoroScanClient, SoroScanClient

indexer_address = "GABC111222333444555666777888999AAABBBCCCDDDEEEFFF00"

with SoroScanClient(base_url="https://api.soroscan.io") as client:
    stats = client.get_indexer_stats(indexer_address)
    print(stats.events_recorded)

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        stats = await client.get_indexer_stats(indexer_address)
        print(stats.events_recorded)

asyncio.run(main())
```

Signature: `get_indexer_stats(indexer: str) -> IndexerStats`.

### Record a Batch of Events

`record_events_batch` submits 1–25 `EventEntry` objects in one transaction. Each entry requires `contract_id`,
`event_type`, and `payload_hash`; their maximum lengths are 56, 100, and 64 characters, respectively. It returns a
`RecordEventsBatchResponse` containing the submission status and resulting event count.

```python
import asyncio

from soroscan import AsyncSoroScanClient, SoroScanClient
from soroscan.models import EventEntry

events = [
    EventEntry(
        contract_id="CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
        event_type="transfer",
        payload_hash="a" * 64,
    ),
    EventEntry(
        contract_id="CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
        event_type="swap",
        payload_hash="b" * 64,
    ),
]

with SoroScanClient(base_url="https://api.soroscan.io") as client:
    result = client.record_events_batch(events)
    print(result.status, result.total_events)

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        result = await client.record_events_batch(events)
        print(result.status, result.total_events)

asyncio.run(main())
```

Signature: `record_events_batch(events: list[EventEntry]) -> RecordEventsBatchResponse`.

### Record an Idempotent Structured Event

`record_structured_event` submits an SC-38 event with a `schema_version` and `correlation_id` for idempotency. It
returns a `RecordEventResponse`. The schema version must be at least 1; `contract_id`, `event_type`, `payload_hash`,
and `correlation_id` have maximum lengths of 56, 100, 64, and 64 characters.

```python
import asyncio

from soroscan import AsyncSoroScanClient, SoroScanClient

with SoroScanClient(base_url="https://api.soroscan.io") as client:
    result = client.record_structured_event(
        contract_id="CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
        event_type="transfer",
        payload_hash="a" * 64,
        schema_version=1,
        correlation_id="transfer-2026-001",
    )
    print(result.status, result.tx_hash)

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        result = await client.record_structured_event(
            contract_id="CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
            event_type="transfer",
            payload_hash="a" * 64,
            schema_version=1,
            correlation_id="transfer-2026-001",
        )
        print(result.status, result.tx_hash)

asyncio.run(main())
```

Signature: `record_structured_event(contract_id: str, event_type: str, payload_hash: str, schema_version: int, correlation_id: str) -> RecordEventResponse`.

### Exceptions

These methods can raise `SoroScanValidationError` for HTTP 400 responses, `SoroScanAuthenticationError` (401),
`SoroScanAuthorizationError` (403), `SoroScanNotFoundError` (404), `SoroScanRateLimitError` (429),
`SoroScanServerError` (5xx), or `SoroScanAPIError` for other API errors. Pydantic `ValidationError` can be raised
for invalid request values or malformed response data. The recent-events method also raises `ValueError` for an
out-of-range limit. HTTP transport and timeout errors may propagate as `httpx` exceptions.

### Fluent Builder Pattern (issue #1281)

Construct complex queries with a chainable, type-hinted builder. Every method returns `Self` for fluency; call `build()`
to inspect params or `execute()` to run.

```python
from soroscan import SoroScanClient

client = SoroScanClient(base_url="https://api.soroscan.io", api_key="...")

# Events — inspect query without network call
query = (SoroScanClient()
    .events()
    .filter_by_contract("ABC123")
    .filter_by_event_type("transfer")
    .paginate(limit=50, offset=0)
    .build())
# {'contract_id': 'ABC123', 'event_type': 'transfer', 'ordering': '-timestamp', 'page': 1, 'page_size': 50}

# Execute with additional filters
events = (client.events()
    .filter_by_contract("ABC123")
    .filter_by_event_type("transfer")
    .filter_by_ledger_range(min=1000, max=2000)
    .order_by("-timestamp")
    .paginate(limit=50, offset=0)
    .execute())

# Contracts
contracts = (client.contracts()
    .filter_by_active(True)
    .search("token")
    .page(1, 20)
    .execute())

# Webhooks
webhooks = (client.webhooks()
    .filter_by_active(True)
    .filter_by_event_type("transfer")
    .paginate(limit=20, offset=0)
    .execute())
```

Async (with `await`):

```python
import asyncio
from soroscan import AsyncSoroScanClient

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        events = await (client.events()
            .filter_by_contract("ABC123")
            .filter_by_event_type("transfer")
            .paginate(limit=50, offset=0)
            .execute())

asyncio.run(main())
```

> Builders are unit-tested in `sdk/python/tests/test_builder.py` and verified with `mypy --strict`.

### Tagged Events (SC-24)

SoroScan supports recording and indexing events with up to 4 producer-defined tags. This allows off-chain indexers to
categorize and filter events efficiently:

```python
# Submit a tagged event
response = client.record_tagged_event(
    contract_id="CCAAA...",
    event_type="transfer",
    payload_hash="a" * 64,
    tags=["defi", "token"]
)
print(f"Status: {response.status} | Echoed Tags: {response.tags}")
```

## Features

- **Type Safety**: Built with Pydantic v2 for robust data validation.
- **Full Coverage**: 100% endpoint coverage for Contracts, Events, and Webhooks.
- **Async Support**: Native support for `httpx` async clients.
- **Context Managers**: Clean resource management for both sync and async clients.

## Error Handling

The SDK raises specific exceptions for different error scenarios:

```python
from soroscan.exceptions import NotFoundError, ValidationError

try:
    client.get_contract("INVALID_ID")
except NotFoundError:
    print("Contract not found!")
except ValidationError as e:
    print(f"Input error: {e}")
```

For more detailed information, see the
[official GitHub repository](https://github.com/Harbduls/soroscan/tree/main/sdk/python).

If you want to contribute new methods or releases, see the [SDK Development Guide](./contributing/sdk-development.md)
and the comprehensive [SDK & Library Development Guide](./sdk/sdk-development-guide.md).
