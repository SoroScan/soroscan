# Python SDK

The **SoroScan Python SDK** is the official library for integrating SoroScan into your Python applications. It supports both synchronous and asynchronous operations and is fully type-hinted.

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

Use `--output table` (default) or `--output json`. Point `--base-url` at a local SoroScan instance when developing against a self-hosted stack.

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
### Fluent Builder Pattern (issue #1281)

Construct complex queries with a chainable, type-hinted builder. Every method returns `Self` for fluency; call `build()` to inspect params or `execute()` to run.

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

SoroScan supports recording and indexing events with up to 4 producer-defined tags. This allows off-chain indexers to categorize and filter events efficiently:

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

### Additional client methods

The methods below are available on both `SoroScanClient` and `AsyncSoroScanClient`; async calls
use the same signatures with `await`. Their request/response shapes are verified by the mocked-HTTP
tests in `sdk/python/tests/` (for example `test_sc9_add_indexer.py`, `test_sc29_batch.py`,
`test_sc30_recent_events.py`, and `test_sc38_structured_event.py`).

Every method in this section can raise the following errors:

- `SoroScanValidationError` (HTTP 400), `SoroScanAuthenticationError` (401),
  `SoroScanAuthorizationError` (403), `SoroScanNotFoundError` (404), `SoroScanRateLimitError` (429),
  `SoroScanServerError` (5xx), or `SoroScanAPIError` for any other non-2xx response.
- `pydantic.ValidationError` when the request model rejects arguments or the response does not
  match its Pydantic model.
- `httpx.HTTPError` on transport failures: these methods call `httpx` directly, so the typed
  `SoroScanTimeoutError` / `SoroScanConnectionError` wrappers (used by `_safe_request`) do not apply.

#### `add_indexer(indexer_address: str) -> AddIndexerResponse`

Authorize a Stellar address to record events on the SoroScan contract (SC-9). The result contains
`status`, `tx_hash`, `transaction_status`, and `error`.

Synchronous:

```python
from soroscan import SoroScanClient

with SoroScanClient(base_url="https://api.soroscan.io", api_key="your-api-key") as client:
    result = client.add_indexer("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")
    print(result.status, result.tx_hash)
```

Asynchronous:

```python
import asyncio
from soroscan import AsyncSoroScanClient

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        result = await client.add_indexer("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")
        print(result.status, result.tx_hash)

asyncio.run(main())
```

Raises: the common errors above; `pydantic.ValidationError` when the address is longer than 56
characters.

#### `get_admin() -> GetAdminResponse`

Return the current SoroScan contract admin address (SC-15) as `admin_address`
(`str | None` if no admin is set).

Synchronous:

```python
from soroscan import SoroScanClient

with SoroScanClient(base_url="https://api.soroscan.io", api_key="your-api-key") as client:
    print(client.get_admin().admin_address)
```

Asynchronous:

```python
import asyncio
from soroscan import AsyncSoroScanClient

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        result = await client.get_admin()
        print(result.admin_address)

asyncio.run(main())
```

Raises: the common errors above (the method takes no arguments, so there is no input validation).

#### `get_contract_recent_events(contract_id: str, limit: int = 10) -> list[ContractEvent]`

Return the newest events for one contract, newest first (SC-30). Each item is a `ContractEvent`
with `id`, `contract_id`, `event_type`, `payload`, `payload_hash`, `ledger`, `timestamp`, `tx_hash`,
and the other fields defined in `soroscan.models`.

Synchronous:

```python
from soroscan import SoroScanClient

with SoroScanClient(base_url="https://api.soroscan.io", api_key="your-api-key") as client:
    events = client.get_contract_recent_events("CABC...", limit=5)
    for event in events:
        print(event.ledger, event.event_type)
```

Asynchronous:

```python
import asyncio
from soroscan import AsyncSoroScanClient

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        events = await client.get_contract_recent_events("CABC...", limit=5)
        for event in events:
            print(event.ledger, event.event_type)

asyncio.run(main())
```

Raises: the common errors above; `ValueError` when `limit` is outside `1..20`
(`MAX_RECENT_EVENTS_LIMIT`), `pydantic.ValidationError` when an event payload is malformed.

#### `get_contract_status() -> ContractStatus`

Return the contract pause/health status (SC-28): `paused`, `admin`, and `total_events`.

Synchronous:

```python
from soroscan import SoroScanClient

with SoroScanClient(base_url="https://api.soroscan.io", api_key="your-api-key") as client:
    status = client.get_contract_status()
    print(status.paused, status.admin, status.total_events)
```

Asynchronous:

```python
import asyncio
from soroscan import AsyncSoroScanClient

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        status = await client.get_contract_status()
        print(status.paused, status.admin, status.total_events)

asyncio.run(main())
```

Raises: the common errors above (the method takes no arguments).

#### `get_indexer_stats(indexer: str) -> IndexerStats`

Return how many events an indexer has recorded (SC-13): `indexer` and `events_recorded`.

Synchronous:

```python
from soroscan import SoroScanClient

with SoroScanClient(base_url="https://api.soroscan.io", api_key="your-api-key") as client:
    stats = client.get_indexer_stats("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")
    print(stats.indexer, stats.events_recorded)
```

Asynchronous:

```python
import asyncio
from soroscan import AsyncSoroScanClient

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        stats = await client.get_indexer_stats("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")
        print(stats.indexer, stats.events_recorded)

asyncio.run(main())
```

Raises: the common errors above (an indexer with no recorded events returns `events_recorded=0`
rather than an error).

#### `is_indexer(indexer_address: str) -> IsIndexerResponse`

Check whether an address is an authorized indexer (SC-15). The response field is `is_indexer`
(`bool`).

Synchronous:

```python
from soroscan import SoroScanClient

with SoroScanClient(base_url="https://api.soroscan.io", api_key="your-api-key") as client:
    result = client.is_indexer("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")
    print(result.is_indexer)
```

Asynchronous:

```python
import asyncio
from soroscan import AsyncSoroScanClient

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        result = await client.is_indexer("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")
        print(result.is_indexer)

asyncio.run(main())
```

Raises: the common errors above (unauthorized addresses return `is_indexer=False`).

#### `record_events_batch(events: list[EventEntry]) -> RecordEventsBatchResponse`

Record between 1 and 25 events in one transaction (SC-29). `EventEntry` has `contract_id`,
`event_type`, and `payload_hash`; the result exposes `status`, `total_events`, `tx_hash`,
`transaction_status`, and `error`.

Synchronous:

```python
from soroscan import SoroScanClient
from soroscan.models import EventEntry

entries = [
    EventEntry(contract_id="CABC...", event_type="transfer", payload_hash="a" * 64),
    EventEntry(contract_id="CABC...", event_type="swap", payload_hash="b" * 64),
]
with SoroScanClient(base_url="https://api.soroscan.io", api_key="your-api-key") as client:
    result = client.record_events_batch(entries)
    print(result.status, result.total_events, result.tx_hash)
```

Asynchronous:

```python
import asyncio
from soroscan import AsyncSoroScanClient
from soroscan.models import EventEntry

async def main():
    entries = [
        EventEntry(contract_id="CABC...", event_type="transfer", payload_hash="a" * 64),
        EventEntry(contract_id="CABC...", event_type="swap", payload_hash="b" * 64),
    ]
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        result = await client.record_events_batch(entries)
        print(result.status, result.total_events, result.tx_hash)

asyncio.run(main())
```

Raises: the common errors above; `pydantic.ValidationError` for an empty batch, more than 25
entries, or an invalid `EventEntry`.

#### `record_structured_event(contract_id: str, event_type: str, payload_hash: str, schema_version: int, correlation_id: str) -> RecordEventResponse`

Submit an idempotent SC-38 event. `schema_version` must be positive and `correlation_id` is the
idempotency key (both are validated by `StructuredEventRequest`). The result has `status`,
`tx_hash`, `transaction_status`, and `error`.

Synchronous:

```python
from soroscan import SoroScanClient

with SoroScanClient(base_url="https://api.soroscan.io", api_key="your-api-key") as client:
    result = client.record_structured_event(
        contract_id="CABC...",
        event_type="transfer",
        payload_hash="a" * 64,
        schema_version=1,
        correlation_id="b" * 64,
    )
    print(result.status, result.tx_hash)
```

Asynchronous:

```python
import asyncio
from soroscan import AsyncSoroScanClient

async def main():
    async with AsyncSoroScanClient(base_url="https://api.soroscan.io") as client:
        result = await client.record_structured_event(
            contract_id="CABC...",
            event_type="transfer",
            payload_hash="a" * 64,
            schema_version=1,
            correlation_id="b" * 64,
        )
        print(result.status, result.tx_hash)

asyncio.run(main())
```

Raises: the common errors above; `pydantic.ValidationError` when `schema_version` is less than 1
or any field exceeds its model length limit.

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

For more detailed information, see the [official GitHub repository](https://github.com/Harbduls/soroscan/tree/main/sdk/python).

If you want to contribute new methods or releases, see the [SDK Development Guide](./contributing/sdk-development.md) and the comprehensive [SDK & Library Development Guide](./sdk/sdk-development-guide.md).
