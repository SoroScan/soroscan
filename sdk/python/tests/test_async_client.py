"""Tests for the async SoroScan client connection cleanup on close.

Covers issue #1542: verifying that ``await client.close()`` and the
``async with SoroScanClient(...)`` context manager properly close the
underlying HTTP session connections without leaking resources.
"""

import gc
import warnings

import httpx
import pytest

from soroscan import AsyncSoroScanClient, AsyncSoroscanClient


BASE_URL = "https://api.soroscan.test"


@pytest.mark.asyncio
async def test_await_close_closes_http_session():
    """``await client.close()`` must close the underlying HTTP session."""
    client = AsyncSoroScanClient(base_url=BASE_URL)

    session = client._client
    assert isinstance(session, httpx.AsyncClient)
    assert not session.is_closed

    await client.close()

    assert session.is_closed


@pytest.mark.asyncio
async def test_await_close_is_idempotent():
    """Calling ``close`` more than once must not raise or leak."""
    client = AsyncSoroScanClient(base_url=BASE_URL)

    await client.close()
    await client.close()

    assert client._client.is_closed


@pytest.mark.asyncio
async def test_context_manager_closes_http_session():
    """The ``async with`` context manager must close the session on exit."""
    async with AsyncSoroScanClient(base_url=BASE_URL) as client:
        session = client._client
        assert isinstance(session, httpx.AsyncClient)
        assert not session.is_closed

    assert session.is_closed


@pytest.mark.asyncio
async def test_context_manager_closes_session_on_exception():
    """The session must be closed even when the body raises."""
    session = None

    with pytest.raises(RuntimeError):
        async with AsyncSoroScanClient(base_url=BASE_URL) as client:
            session = client._client
            assert not session.is_closed
            raise RuntimeError("boom")

    assert session is not None
    assert session.is_closed


@pytest.mark.asyncio
async def test_close_emits_no_unclosed_session_warnings():
    """Closing the client must not leave unclosed HTTP session warnings."""
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")

        client = AsyncSoroScanClient(base_url=BASE_URL)
        await client.close()

        # Force any lingering finalizers to run while we are still capturing.
        del client
        gc.collect()

    unclosed = [
        w
        for w in caught
        if "unclosed" in str(w.message).lower()
        or "not closed" in str(w.message).lower()
    ]
    assert unclosed == [], f"unexpected unclosed session warnings: {unclosed}"


@pytest.mark.asyncio
async def test_context_manager_emits_no_unclosed_session_warnings():
    """The context manager path must not leave unclosed session warnings."""
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")

        async with AsyncSoroScanClient(base_url=BASE_URL) as client:
            assert not client._client.is_closed

        gc.collect()

    unclosed = [
        w
        for w in caught
        if "unclosed" in str(w.message).lower()
        or "not closed" in str(w.message).lower()
    ]
    assert unclosed == [], f"unexpected unclosed session warnings: {unclosed}"


@pytest.mark.asyncio
async def test_async_soroscan_client_alias_closes():
    """The ``AsyncSoroscanClient`` alias must also clean up on close."""
    client = AsyncSoroscanClient(base_url=BASE_URL)
    session = client._client

    await client.close()

    assert session.is_closed
