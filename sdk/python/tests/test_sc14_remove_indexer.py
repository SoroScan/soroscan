"""Tests for SC-14: indexer deauthorization."""

import pytest
from pytest_httpx import HTTPXMock

from soroscan import AsyncSoroScanClient, SoroScanClient
from soroscan.models import RemoveIndexerResponse

INDEXER_ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
REMOVE_RESPONSE = {
    "status": "submitted",
    "tx_hash": "txremoveindexer001",
    "transaction_status": "pending",
    "error": None,
}


def test_remove_indexer(base_url: str, httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url=f"{base_url}/api/ingest/indexers/remove/",
        json=REMOVE_RESPONSE,
        status_code=202,
    )

    with SoroScanClient(base_url=base_url) as client:
        result = client.remove_indexer(INDEXER_ADDRESS)

    assert isinstance(result, RemoveIndexerResponse)
    assert result.status == "submitted"
    assert result.tx_hash == "txremoveindexer001"


@pytest.mark.anyio
async def test_async_remove_indexer(base_url: str, httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(
        url=f"{base_url}/api/ingest/indexers/remove/",
        json=REMOVE_RESPONSE,
        status_code=202,
    )

    async with AsyncSoroScanClient(base_url=base_url) as client:
        result = await client.remove_indexer(INDEXER_ADDRESS)

    assert result.status == "submitted"
