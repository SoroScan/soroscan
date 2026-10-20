"""
Tests for SDK typed error translation via _safe_request (issue #1668).

Covers:
  - SoroScanClient (sync):
      * httpx.TimeoutException -> SoroScanTimeoutError
      * httpx.ConnectError -> SoroScanConnectionError
      * httpx.NetworkError -> SoroScanConnectionError
      * Multiple endpoint routes (contracts, events, webhooks, stats)
      * Context manager compatibility
  - AsyncSoroScanClient (async):
      * httpx.TimeoutException -> SoroScanTimeoutError
      * httpx.ConnectError -> SoroScanConnectionError
      * httpx.NetworkError -> SoroScanConnectionError
      * Multiple endpoint routes (contracts, events, webhooks, stats)
      * Async context manager compatibility
"""

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from soroscan.client import AsyncSoroScanClient, SoroScanClient
from soroscan.exceptions import SoroScanConnectionError, SoroScanTimeoutError


class TestSyncSafeRequest:
    def test_sync_timeout_raises_soroscan_timeout_error(self):
        client = SoroScanClient(base_url="https://api.soroscan.com", timeout=12.5)
        client._client.request = MagicMock(
            side_effect=httpx.ReadTimeout("Read timed out")
        )

        with pytest.raises(SoroScanTimeoutError) as exc_info:
            client.get_contract("C123")

        err = exc_info.value
        assert err.timeout == 12.5
        assert "https://api.soroscan.com/api/contracts/C123/" in err.url
        assert "timed out after 12.5s" in str(err)
        client.close()

    def test_sync_connect_error_raises_soroscan_connection_error(self):
        client = SoroScanClient(base_url="https://api.soroscan.com")
        client._client.request = MagicMock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        with pytest.raises(SoroScanConnectionError) as exc_info:
            client.get_contracts()

        err = exc_info.value
        assert "https://api.soroscan.com/api/contracts/" in err.url
        assert "Could not connect to" in str(err)
        client.close()

    def test_sync_network_error_raises_soroscan_connection_error(self):
        client = SoroScanClient(base_url="https://api.soroscan.com")
        client._client.request = MagicMock(
            side_effect=httpx.NetworkError("Network unreachable")
        )

        with pytest.raises(SoroScanConnectionError) as exc_info:
            client.create_contract(contract_id="C456", name="Test")

        err = exc_info.value
        assert "Network error reaching" in str(err)
        client.close()

    def test_sync_events_and_webhooks_raise_typed_errors(self):
        with SoroScanClient(base_url="https://api.soroscan.com", timeout=5.0) as client:
            client._client.request = MagicMock(
                side_effect=httpx.ConnectTimeout("Connect timed out")
            )

            with pytest.raises(SoroScanTimeoutError):
                client.get_events()

            with pytest.raises(SoroScanTimeoutError):
                client.get_webhooks()

            with pytest.raises(SoroScanTimeoutError):
                client.get_contract_stats("C123")


@pytest.mark.asyncio
class TestAsyncSafeRequest:
    async def test_async_timeout_raises_soroscan_timeout_error(self):
        client = AsyncSoroScanClient(base_url="https://api.soroscan.com", timeout=8.0)
        client._client.request = AsyncMock(
            side_effect=httpx.WriteTimeout("Write timed out")
        )

        with pytest.raises(SoroScanTimeoutError) as exc_info:
            await client.get_contract("C789")

        err = exc_info.value
        assert err.timeout == 8.0
        assert "https://api.soroscan.com/api/contracts/C789/" in err.url
        assert "timed out after 8.0s" in str(err)
        await client.close()

    async def test_async_connect_error_raises_soroscan_connection_error(self):
        client = AsyncSoroScanClient(base_url="https://api.soroscan.com")
        client._client.request = AsyncMock(
            side_effect=httpx.ConnectError("DNS failure")
        )

        with pytest.raises(SoroScanConnectionError) as exc_info:
            await client.get_contracts()

        err = exc_info.value
        assert "https://api.soroscan.com/api/contracts/" in err.url
        assert "Could not connect to" in str(err)
        await client.close()

    async def test_async_network_error_raises_soroscan_connection_error(self):
        client = AsyncSoroScanClient(base_url="https://api.soroscan.com")
        client._client.request = AsyncMock(
            side_effect=httpx.NetworkError("Socket dropped")
        )

        with pytest.raises(SoroScanConnectionError) as exc_info:
            await client.create_contract(contract_id="C999", name="TestAsync")

        err = exc_info.value
        assert "Network error reaching" in str(err)
        await client.close()

    async def test_async_events_and_webhooks_raise_typed_errors(self):
        async with AsyncSoroScanClient(base_url="https://api.soroscan.com", timeout=6.0) as client:
            client._client.request = AsyncMock(
                side_effect=httpx.PoolTimeout("Pool exhausted")
            )

            with pytest.raises(SoroScanTimeoutError):
                await client.get_events()

            with pytest.raises(SoroScanTimeoutError):
                await client.get_webhooks()

            with pytest.raises(SoroScanTimeoutError):
                await client.get_contract_stats("C123")
