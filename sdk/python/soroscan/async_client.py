"""Standalone asynchronous SoroScan SDK client.

The core non-blocking implementation already lives in
``soroscan.client.AsyncSoroScanClient``. This module exposes the requested
``soroscan.async_client.AsyncSoroscanClient`` import path while preserving
the existing class name for backwards compatibility.
"""

from typing import Literal

from soroscan.client import AsyncSoroScanClient as _AsyncSoroScanClient
from soroscan.models import ContractEvent, PaginatedResponse, WebhookSubscription


class AsyncSoroscanClient(_AsyncSoroScanClient):
    """Non-blocking SoroScan client backed by ``httpx.AsyncClient``."""

    async def list_events(
        self,
        contract_id: str | None = None,
        event_type: str | None = None,
        ledger: int | None = None,
        ledger_min: int | None = None,
        ledger_max: int | None = None,
        validation_status: Literal["passed", "failed"] | None = None,
        ordering: str = "-timestamp",
        page: int = 1,
        page_size: int = 50,
    ) -> PaginatedResponse[ContractEvent]:
        """List indexed events without blocking the asyncio event loop."""
        return await self.get_events(
            contract_id=contract_id,
            event_type=event_type,
            ledger=ledger,
            ledger_min=ledger_min,
            ledger_max=ledger_max,
            validation_status=validation_status,
            ordering=ordering,
            page=page,
            page_size=page_size,
        )

    async def subscribe(
        self,
        contract_id: int,
        target_url: str,
        event_type: str = "",
    ) -> WebhookSubscription:
        """Create a webhook subscription asynchronously."""
        return await self.create_webhook(
            contract_id=contract_id,
            target_url=target_url,
            event_type=event_type,
        )


AsyncSoroScanClient = AsyncSoroscanClient

__all__ = ["AsyncSoroscanClient", "AsyncSoroScanClient"]
