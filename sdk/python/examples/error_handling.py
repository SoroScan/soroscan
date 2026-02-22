"""
Error handling examples for SoroScan SDK.

Demonstrates proper exception handling patterns.
"""

from soroscan import SoroScanClient
from soroscan.exceptions import (
    SoroScanAPIError,
    SoroScanAuthError,
    SoroScanError,
    SoroScanNotFoundError,
    SoroScanRateLimitError,
    SoroScanValidationError,
)


def handle_specific_errors() -> None:
    """Demonstrate handling specific error types."""
    client = SoroScanClient(base_url="https://api.soroscan.io")

    try:
        # This might fail with various errors
        contract = client.get_contract("invalid-id")
        print(f"Found contract: {contract.name}")

    except SoroScanNotFoundError as e:
        print(f"Contract not found: {e}")
        print(f"Status code: {e.status_code}")

    except SoroScanAuthError as e:
        print(f"Authentication failed: {e}")
        print("Please check your API key")

    except SoroScanRateLimitError as e:
        print(f"Rate limit exceeded: {e}")
        print("Please wait before retrying")

    except SoroScanValidationError as e:
        print(f"Invalid request: {e}")
        print(f"Response data: {e.response_data}")

    except SoroScanAPIError as e:
        print(f"API error: {e}")
        print(f"Status: {e.status_code}")

    except SoroScanError as e:
        print(f"SDK error: {e}")

    finally:
        client.close()


def retry_with_backoff() -> None:
    """Demonstrate retry logic with exponential backoff."""
    import time

    client = SoroScanClient(base_url="https://api.soroscan.io")
    max_retries = 3
    base_delay = 1.0

    for attempt in range(max_retries):
        try:
            events = client.get_events(page_size=50)
            print(f"Successfully fetched {len(events.results)} events")
            break

        except SoroScanRateLimitError:
            if attempt < max_retries - 1:
                delay = base_delay * (2**attempt)
                print(f"Rate limited. Retrying in {delay}s...")
                time.sleep(delay)
            else:
                print("Max retries reached. Giving up.")

        except SoroScanError as e:
            print(f"Error: {e}")
            break

    client.close()


def graceful_degradation() -> None:
    """Demonstrate graceful degradation on errors."""
    client = SoroScanClient(base_url="https://api.soroscan.io")

    # Try to get detailed stats, fall back to basic info
    contract_id = "1"

    try:
        stats = client.get_contract_stats(contract_id)
        print(f"Total events: {stats.total_events}")
        print(f"Event types: {stats.unique_event_types}")

    except SoroScanError:
        print("Stats unavailable, fetching basic contract info...")
        try:
            contract = client.get_contract(contract_id)
            print(f"Contract: {contract.name}")
            print(f"Active: {contract.is_active}")
        except SoroScanError as e:
            print(f"Could not fetch contract: {e}")

    client.close()


if __name__ == "__main__":
    print("=== Specific Error Handling ===")
    handle_specific_errors()

    print("\n=== Retry with Backoff ===")
    retry_with_backoff()

    print("\n=== Graceful Degradation ===")
    graceful_degradation()
