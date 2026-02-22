"""
Async usage examples for SoroScan SDK.

This script demonstrates async operations and concurrent requests.
"""

import asyncio

from soroscan import AsyncSoroScanClient
from soroscan.exceptions import SoroScanError


async def fetch_contract_data(client: AsyncSoroScanClient, contract_id: str) -> None:
    """Fetch and display contract data."""
    try:
        contract = await client.get_contract(contract_id)
        stats = await client.get_contract_stats(contract_id)

        print(f"\nContract: {contract.name}")
        print(f"  Address: {contract.contract_id}")
        print(f"  Total events: {stats.total_events}")
        print(f"  Event types: {stats.unique_event_types}")
    except SoroScanError as e:
        print(f"Error fetching contract {contract_id}: {e}")


async def monitor_events(client: AsyncSoroScanClient, contract_id: str) -> None:
    """Monitor events for a contract."""
    print(f"\n=== Monitoring events for {contract_id} ===")

    events = await client.get_events(
        contract_id=contract_id,
        page_size=10,
        ordering="-timestamp",
    )

    for event in events.results:
        print(f"  [{event.timestamp}] {event.event_type}")
        print(f"    Ledger: {event.ledger}, TX: {event.tx_hash[:8]}...")


async def batch_create_webhooks(
    client: AsyncSoroScanClient,
    contract_ids: list[int],
    base_url: str,
) -> None:
    """Create multiple webhooks concurrently."""
    print("\n=== Creating webhooks concurrently ===")

    tasks = [
        client.create_webhook(
            contract_id=cid,
            target_url=f"{base_url}/webhook/{cid}",
            event_type="",
        )
        for cid in contract_ids
    ]

    webhooks = await asyncio.gather(*tasks, return_exceptions=True)

    for i, result in enumerate(webhooks):
        if isinstance(result, Exception):
            print(f"  Contract {contract_ids[i]}: Failed - {result}")
        else:
            print(f"  Contract {contract_ids[i]}: Webhook {result.id} created")


async def stream_events_continuously(
    client: AsyncSoroScanClient,
    contract_id: str,
    interval: int = 5,
) -> None:
    """
    Continuously poll for new events.

    Note: This is a polling implementation. For real-time streaming,
    use WebSocket subscriptions (Phase 2).
    """
    print(f"\n=== Streaming events (polling every {interval}s) ===")
    last_ledger = 0

    try:
        while True:
            events = await client.get_events(
                contract_id=contract_id,
                ledger_min=last_ledger + 1,
                ordering="ledger",
                page_size=50,
            )

            if events.results:
                for event in events.results:
                    print(f"  NEW: {event.event_type} @ ledger {event.ledger}")
                    last_ledger = max(last_ledger, event.ledger)

            await asyncio.sleep(interval)
    except KeyboardInterrupt:
        print("\nStopped streaming")


async def main() -> None:
    """Run async examples."""
    async with AsyncSoroScanClient(
        base_url="https://api.soroscan.io",
        api_key="your-api-key-here",
    ) as client:
        # Example 1: Fetch multiple contracts concurrently
        print("=== Fetching Multiple Contracts ===")
        contract_ids = ["1", "2", "3"]
        tasks = [fetch_contract_data(client, cid) for cid in contract_ids]
        await asyncio.gather(*tasks)

        # Example 2: Monitor events
        await monitor_events(
            client,
            "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
        )

        # Example 3: Batch create webhooks
        await batch_create_webhooks(
            client,
            contract_ids=[1, 2, 3],
            base_url="https://myapp.com",
        )

        # Example 4: Stream events (uncomment to run)
        # await stream_events_continuously(
        #     client,
        #     "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
        #     interval=5,
        # )


if __name__ == "__main__":
    asyncio.run(main())
