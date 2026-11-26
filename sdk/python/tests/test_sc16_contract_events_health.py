"""Tests for SC-16: get_contract_events and get_contract_health."""

import pytest
from pytest_httpx import HTTPXMock

from soroscan import AsyncSoroScanClient, SoroScanClient
from soroscan.exceptions import (
    SoroScanAuthenticationError,
    SoroScanNotFoundError,
    SoroScanServerError,
)
from soroscan.models import ContractEvent, ContractHealth


# ── Shared fixtures ───────────────────────────────────────────────────────────

CONTRACT_ID = "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF"


def _event(event_type: str, ledger: int) -> dict:
    return {
        "id": ledger,
        "contract_id": CONTRACT_ID,
        "contract_name": "Test Contract",
        "event_type": event_type,
        "payload": {"amount": 100},
        "payload_hash": "a" * 64,
        "ledger": ledger,
        "event_index": 0,
        "timestamp": "2024-01-01T00:00:00Z",
        "tx_hash": "b" * 64,
        "schema_version": None,
        "validation_status": "passed",
    }


EVENTS_RESPONSE = [
    _event("transfer", 300),
    _event("mint", 299),
    _event("burn", 298),
]

HEALTHY_RESPONSE = {
    "contract_id": CONTRACT_ID,
    "status": "healthy",
    "last_event_time": "2024-01-01T12:00:00Z",
    "minutes_since_last_event": 5,
    "abi_decode_errors_1h": 0,
    "consecutive_failures": 0,
    "error_message": "",
    "checked_at": "2024-01-01T12:05:00Z",
}

UNHEALTHY_RESPONSE = {
    "contract_id": CONTRACT_ID,
    "status": "unhealthy",
    "last_event_time": None,
    "minutes_since_last_event": None,
    "abi_decode_errors_1h": 3,
    "consecutive_failures": 7,
    "error_message": "RPC timeout",
    "checked_at": "2024-01-01T12:05:00Z",
}


# ── Sync: get_contract_events ─────────────────────────────────────────────────


def test_get_contract_events_success(base_url: str, httpx_mock: HTTPXMock) -> None:
    """get_contract_events returns a list of ContractEvent instances."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/events/?limit=100",
        json=EVENTS_RESPONSE,
        status_code=200,
    )

    with SoroScanClient(base_url=base_url) as client:
        events = client.get_contract_events(CONTRACT_ID)

    assert len(events) == 3
    assert all(isinstance(e, ContractEvent) for e in events)
    assert events[0].event_type == "transfer"
    assert events[0].ledger == 300
    assert events[0].contract_id == CONTRACT_ID
    assert events[0].payload == {"amount": 100}
    assert events[0].validation_status == "passed"


def test_get_contract_events_default_limit(base_url: str, httpx_mock: HTTPXMock) -> None:
    """The default limit=100 is sent as a query parameter."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/events/?limit=100",
        json=EVENTS_RESPONSE,
        status_code=200,
    )

    with SoroScanClient(base_url=base_url) as client:
        client.get_contract_events(CONTRACT_ID)

    # pytest-httpx raises if the registered URL was never matched
    # (i.e. if a different URL was called), so reaching here proves the URL.


def test_get_contract_events_custom_limit(base_url: str, httpx_mock: HTTPXMock) -> None:
    """A custom limit is forwarded as a query parameter."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/events/?limit=25",
        json=EVENTS_RESPONSE[:1],
        status_code=200,
    )

    with SoroScanClient(base_url=base_url) as client:
        events = client.get_contract_events(CONTRACT_ID, limit=25)

    assert len(events) == 1


def test_get_contract_events_empty(base_url: str, httpx_mock: HTTPXMock) -> None:
    """An empty list is a valid response."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/events/?limit=100",
        json=[],
        status_code=200,
    )

    with SoroScanClient(base_url=base_url) as client:
        events = client.get_contract_events(CONTRACT_ID)

    assert events == []


def test_get_contract_events_401(base_url: str, httpx_mock: HTTPXMock) -> None:
    """get_contract_events raises SoroScanAuthenticationError on 401."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/events/?limit=100",
        json={"detail": "Authentication credentials were not provided."},
        status_code=401,
    )

    with SoroScanClient(base_url=base_url) as client:
        with pytest.raises(SoroScanAuthenticationError) as exc_info:
            client.get_contract_events(CONTRACT_ID)

    assert exc_info.value.status_code == 401


def test_get_contract_events_404(base_url: str, httpx_mock: HTTPXMock) -> None:
    """get_contract_events raises SoroScanNotFoundError on 404."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/events/?limit=100",
        json={"detail": "Not found."},
        status_code=404,
    )

    with SoroScanClient(base_url=base_url) as client:
        with pytest.raises(SoroScanNotFoundError) as exc_info:
            client.get_contract_events(CONTRACT_ID)

    assert exc_info.value.status_code == 404


def test_get_contract_events_500(base_url: str, httpx_mock: HTTPXMock) -> None:
    """get_contract_events raises SoroScanServerError on 5xx."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/events/?limit=100",
        json={"detail": "Internal Server Error"},
        status_code=500,
    )

    with SoroScanClient(base_url=base_url) as client:
        with pytest.raises(SoroScanServerError) as exc_info:
            client.get_contract_events(CONTRACT_ID)

    assert exc_info.value.status_code == 500


# ── Sync: get_contract_health ─────────────────────────────────────────────────


def test_get_contract_health_healthy(base_url: str, httpx_mock: HTTPXMock) -> None:
    """get_contract_health returns a ContractHealth for a healthy contract."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/health/",
        json=HEALTHY_RESPONSE,
        status_code=200,
    )

    with SoroScanClient(base_url=base_url) as client:
        health = client.get_contract_health(CONTRACT_ID)

    assert isinstance(health, ContractHealth)
    assert health.contract_id == CONTRACT_ID
    assert health.status == "healthy"
    assert health.consecutive_failures == 0
    assert health.abi_decode_errors_1h == 0
    assert health.minutes_since_last_event == 5
    assert health.last_event_time is not None
    assert health.error_message == ""


def test_get_contract_health_unhealthy(base_url: str, httpx_mock: HTTPXMock) -> None:
    """get_contract_health returns a ContractHealth for an unhealthy contract."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/health/",
        json=UNHEALTHY_RESPONSE,
        status_code=200,
    )

    with SoroScanClient(base_url=base_url) as client:
        health = client.get_contract_health(CONTRACT_ID)

    assert isinstance(health, ContractHealth)
    assert health.status == "unhealthy"
    assert health.consecutive_failures == 7
    assert health.abi_decode_errors_1h == 3
    assert health.error_message == "RPC timeout"
    assert health.last_event_time is None
    assert health.minutes_since_last_event is None


def test_get_contract_health_401(base_url: str, httpx_mock: HTTPXMock) -> None:
    """get_contract_health raises SoroScanAuthenticationError on 401."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/health/",
        json={"detail": "Authentication credentials were not provided."},
        status_code=401,
    )

    with SoroScanClient(base_url=base_url) as client:
        with pytest.raises(SoroScanAuthenticationError) as exc_info:
            client.get_contract_health(CONTRACT_ID)

    assert exc_info.value.status_code == 401


def test_get_contract_health_404(base_url: str, httpx_mock: HTTPXMock) -> None:
    """get_contract_health raises SoroScanNotFoundError on 404."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/health/",
        json={"detail": "Not found."},
        status_code=404,
    )

    with SoroScanClient(base_url=base_url) as client:
        with pytest.raises(SoroScanNotFoundError) as exc_info:
            client.get_contract_health(CONTRACT_ID)

    assert exc_info.value.status_code == 404


def test_get_contract_health_500(base_url: str, httpx_mock: HTTPXMock) -> None:
    """get_contract_health raises SoroScanServerError on 5xx."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/health/",
        json={"detail": "Internal Server Error"},
        status_code=500,
    )

    with SoroScanClient(base_url=base_url) as client:
        with pytest.raises(SoroScanServerError) as exc_info:
            client.get_contract_health(CONTRACT_ID)

    assert exc_info.value.status_code == 500


# ── Async: get_contract_events ────────────────────────────────────────────────


@pytest.mark.anyio
async def test_async_get_contract_events_success(
    base_url: str, httpx_mock: HTTPXMock
) -> None:
    """Async get_contract_events returns a list of ContractEvent instances."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/events/?limit=100",
        json=EVENTS_RESPONSE,
        status_code=200,
    )

    async with AsyncSoroScanClient(base_url=base_url) as client:
        events = await client.get_contract_events(CONTRACT_ID)

    assert len(events) == 3
    assert all(isinstance(e, ContractEvent) for e in events)
    assert events[0].event_type == "transfer"
    assert events[0].ledger == 300
    assert events[0].contract_id == CONTRACT_ID


@pytest.mark.anyio
async def test_async_get_contract_events_custom_limit(
    base_url: str, httpx_mock: HTTPXMock
) -> None:
    """Async: a custom limit is forwarded as a query parameter."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/events/?limit=50",
        json=EVENTS_RESPONSE[:2],
        status_code=200,
    )

    async with AsyncSoroScanClient(base_url=base_url) as client:
        events = await client.get_contract_events(CONTRACT_ID, limit=50)

    assert len(events) == 2


@pytest.mark.anyio
async def test_async_get_contract_events_401(
    base_url: str, httpx_mock: HTTPXMock
) -> None:
    """Async get_contract_events raises SoroScanAuthenticationError on 401."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/events/?limit=100",
        json={"detail": "Authentication credentials were not provided."},
        status_code=401,
    )

    async with AsyncSoroScanClient(base_url=base_url) as client:
        with pytest.raises(SoroScanAuthenticationError):
            await client.get_contract_events(CONTRACT_ID)


@pytest.mark.anyio
async def test_async_get_contract_events_404(
    base_url: str, httpx_mock: HTTPXMock
) -> None:
    """Async get_contract_events raises SoroScanNotFoundError on 404."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/events/?limit=100",
        json={"detail": "Not found."},
        status_code=404,
    )

    async with AsyncSoroScanClient(base_url=base_url) as client:
        with pytest.raises(SoroScanNotFoundError):
            await client.get_contract_events(CONTRACT_ID)


@pytest.mark.anyio
async def test_async_get_contract_events_500(
    base_url: str, httpx_mock: HTTPXMock
) -> None:
    """Async get_contract_events raises SoroScanServerError on 5xx."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/events/?limit=100",
        json={"detail": "Internal Server Error"},
        status_code=500,
    )

    async with AsyncSoroScanClient(base_url=base_url) as client:
        with pytest.raises(SoroScanServerError):
            await client.get_contract_events(CONTRACT_ID)


# ── Async: get_contract_health ────────────────────────────────────────────────


@pytest.mark.anyio
async def test_async_get_contract_health_healthy(
    base_url: str, httpx_mock: HTTPXMock
) -> None:
    """Async get_contract_health returns ContractHealth for a healthy contract."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/health/",
        json=HEALTHY_RESPONSE,
        status_code=200,
    )

    async with AsyncSoroScanClient(base_url=base_url) as client:
        health = await client.get_contract_health(CONTRACT_ID)

    assert isinstance(health, ContractHealth)
    assert health.status == "healthy"
    assert health.consecutive_failures == 0
    assert health.abi_decode_errors_1h == 0
    assert health.minutes_since_last_event == 5


@pytest.mark.anyio
async def test_async_get_contract_health_unhealthy(
    base_url: str, httpx_mock: HTTPXMock
) -> None:
    """Async get_contract_health returns ContractHealth for an unhealthy contract."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/health/",
        json=UNHEALTHY_RESPONSE,
        status_code=200,
    )

    async with AsyncSoroScanClient(base_url=base_url) as client:
        health = await client.get_contract_health(CONTRACT_ID)

    assert health.status == "unhealthy"
    assert health.consecutive_failures == 7
    assert health.abi_decode_errors_1h == 3
    assert health.error_message == "RPC timeout"
    assert health.last_event_time is None


@pytest.mark.anyio
async def test_async_get_contract_health_401(
    base_url: str, httpx_mock: HTTPXMock
) -> None:
    """Async get_contract_health raises SoroScanAuthenticationError on 401."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/health/",
        json={"detail": "Authentication credentials were not provided."},
        status_code=401,
    )

    async with AsyncSoroScanClient(base_url=base_url) as client:
        with pytest.raises(SoroScanAuthenticationError):
            await client.get_contract_health(CONTRACT_ID)


@pytest.mark.anyio
async def test_async_get_contract_health_404(
    base_url: str, httpx_mock: HTTPXMock
) -> None:
    """Async get_contract_health raises SoroScanNotFoundError on 404."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/health/",
        json={"detail": "Not found."},
        status_code=404,
    )

    async with AsyncSoroScanClient(base_url=base_url) as client:
        with pytest.raises(SoroScanNotFoundError):
            await client.get_contract_health(CONTRACT_ID)


@pytest.mark.anyio
async def test_async_get_contract_health_500(
    base_url: str, httpx_mock: HTTPXMock
) -> None:
    """Async get_contract_health raises SoroScanServerError on 5xx."""
    httpx_mock.add_response(
        url=f"{base_url}/api/contracts/{CONTRACT_ID}/health/",
        json={"detail": "Internal Server Error"},
        status_code=500,
    )

    async with AsyncSoroScanClient(base_url=base_url) as client:
        with pytest.raises(SoroScanServerError):
            await client.get_contract_health(CONTRACT_ID)
