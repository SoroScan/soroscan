"""
Basic usage examples for SoroScan SDK.

This script demonstrates common SDK operations.
"""

from soroscan import SoroScanClient
from soroscan.exceptions import SoroScanError


def main() -> None:
    """Run basic SDK examples."""
    # Initialize client
    client = SoroScanClient(
        base_url="https://api.soroscan.io",
        api_key="your-api-key-here",  # Optional
    )

    try:
        # Example 1: List all active contracts
        print("=== Listing Active Contracts ===")
        contracts = client.get_contracts(is_active=True, page_size=10)
        print(f"Found {contracts.count} active contracts")
        for contract in contracts.results:
            print(f"  - {contract.name} ({contract.contract_id[:8]}...)")

        # Example 2: Register a new contract
        print("\n=== Registering New Contract ===")
        new_contract = client.create_contract(
            contract_id="CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
            name="My DeFi Protocol",
            description="A decentralized exchange on Stellar",
        )
        print(f"Created contract: {new_contract.name} (ID: {new_contract.id})")

        # Example 3: Query events for a contract
        print("\n=== Querying Events ===")
        events = client.get_events(
            contract_id="CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
            event_type="swap",
            ledger_min=1000000,
            page_size=20,
        )
        print(f"Found {events.count} swap events")
        for event in events.results[:5]:  # Show first 5
            print(f"  - {event.event_type} at ledger {event.ledger}")
            print(f"    Payload: {event.payload}")

        # Example 4: Get contract statistics
        print("\n=== Contract Statistics ===")
        stats = client.get_contract_stats(str(new_contract.id))
        print(f"Contract: {stats.name}")
        print(f"Total events: {stats.total_events}")
        print(f"Unique event types: {stats.unique_event_types}")
        print(f"Last activity: {stats.last_activity}")

        # Example 5: Create a webhook subscription
        print("\n=== Creating Webhook ===")
        webhook = client.create_webhook(
            contract_id=new_contract.id,
            target_url="https://myapp.com/webhook",
            event_type="swap",  # Only notify on swap events
        )
        print(f"Webhook created: {webhook.id}")
        print(f"Target URL: {webhook.target_url}")

        # Example 6: Test the webhook
        print("\n=== Testing Webhook ===")
        test_result = client.test_webhook(webhook.id)
        print(f"Test result: {test_result}")

        # Example 7: Pagination through all events
        print("\n=== Paginating Through Events ===")
        page = 1
        total_processed = 0
        while True:
            page_events = client.get_events(
                contract_id="CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
                page=page,
                page_size=50,
            )

            total_processed += len(page_events.results)
            print(f"Processed page {page}: {len(page_events.results)} events")

            if not page_events.next:
                break
            page += 1

        print(f"Total events processed: {total_processed}")

    except SoroScanError as e:
        print(f"Error: {e}")
    finally:
        # Always close the client
        client.close()


if __name__ == "__main__":
    main()
