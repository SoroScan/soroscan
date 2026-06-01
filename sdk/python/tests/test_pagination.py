"""Tests for Paginator and AsyncPaginator helpers — issue #483."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, AsyncMock

import pytest

from soroscan.models import ContractEvent, PaginatedResponse
from soroscan.pagination import AsyncPaginator, Paginator


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures / helpers
# ─────────────────────────────────────────────────────────────────────────────

BASE_URL = "https://api.test.soroscan.io"


def make_event(event_id: int) -> ContractEvent:
    return ContractEvent(
        id=event_id,
        contract_id="CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
        contract_name="Test Token",
        event_type="transfer",
        payload={"amount": "100"},
        payload_hash="abc123",
        ledger=100000,
        timestamp="2026-01-01T00:00:00Z",
        tx_hash="txhash",
        validation_status="passed",
    )


def make_page(
    event_ids: list[int],
    next_url: str | None = None,
    previous_url: str | None = None,
    count: int = 100,
) -> PaginatedResponse[ContractEvent]:
    return PaginatedResponse[ContractEvent](
        count=count,
        next=next_url,
        previous=previous_url,
        results=[make_event(i) for i in event_ids],
    )


# ─────────────────────────────────────────────────────────────────────────────
# Paginator — has_next_page / has_previous_page
# ─────────────────────────────────────────────────────────────────────────────


class TestPaginatorStateQueries:
    def test_has_next_page_true_before_first_fetch(self) -> None:
        fetcher = MagicMock()
        p: Paginator[ContractEvent] = Paginator(fetcher)
        assert p.has_next_page() is True

    def test_has_next_page_false_when_no_next_url(self) -> None:
        fetcher = MagicMock(return_value=make_page([1], next_url=None))
        p: Paginator[ContractEvent] = Paginator(fetcher)
        p.next_page()
        assert p.has_next_page() is False

    def test_has_next_page_true_when_next_url_present(self) -> None:
        fetcher = MagicMock(
            return_value=make_page([1], next_url=f"{BASE_URL}/api/events/?page=2")
        )
        p: Paginator[ContractEvent] = Paginator(fetcher)
        p.next_page()
        assert p.has_next_page() is True

    def test_has_previous_page_false_before_first_fetch(self) -> None:
        fetcher = MagicMock()
        p: Paginator[ContractEvent] = Paginator(fetcher)
        assert p.has_previous_page() is False

    def test_has_previous_page_false_on_first_page(self) -> None:
        fetcher = MagicMock(return_value=make_page([1], previous_url=None))
        p: Paginator[ContractEvent] = Paginator(fetcher)
        p.next_page()
        assert p.has_previous_page() is False

    def test_has_previous_page_true_on_second_page(self) -> None:
        fetcher = MagicMock(
            return_value=make_page(
                [2],
                next_url=None,
                previous_url=f"{BASE_URL}/api/events/?page=1",
            )
        )
        p: Paginator[ContractEvent] = Paginator(fetcher)
        p._current_page_number = 1  # simulate being on page 1 already
        p.next_page()
        assert p.has_previous_page() is True


# ─────────────────────────────────────────────────────────────────────────────
# Paginator — next_page
# ─────────────────────────────────────────────────────────────────────────────


class TestPaginatorNextPage:
    def test_fetches_first_page(self) -> None:
        page = make_page([1, 2, 3])
        fetcher = MagicMock(return_value=page)
        p: Paginator[ContractEvent] = Paginator(fetcher, page_size=20)

        result = p.next_page()

        assert result is page
        fetcher.assert_called_once_with(page=1, page_size=20)

    def test_increments_page_number(self) -> None:
        fetcher = MagicMock(return_value=make_page([1]))
        p: Paginator[ContractEvent] = Paginator(fetcher)
        assert p.current_page_number == 0
        p.next_page()
        assert p.current_page_number == 1

    def test_passes_base_kwargs_to_fetcher(self) -> None:
        fetcher = MagicMock(return_value=make_page([1]))
        p: Paginator[ContractEvent] = Paginator(
            fetcher, page_size=10, contract_id="CCAAA", event_type="transfer"
        )
        p.next_page()
        fetcher.assert_called_once_with(
            page=1, page_size=10, contract_id="CCAAA", event_type="transfer"
        )

    def test_raises_stop_iteration_when_no_next_page(self) -> None:
        fetcher = MagicMock(return_value=make_page([1], next_url=None))
        p: Paginator[ContractEvent] = Paginator(fetcher)
        p.next_page()
        with pytest.raises(StopIteration, match="no next page"):
            p.next_page()

    def test_fetches_sequential_pages(self) -> None:
        fetcher = MagicMock(
            side_effect=[
                make_page([1], next_url=f"{BASE_URL}/api/events/?page=2"),
                make_page([2], next_url=None),
            ]
        )
        p: Paginator[ContractEvent] = Paginator(fetcher)
        p1 = p.next_page()
        p2 = p.next_page()

        assert p1.results[0].id == 1
        assert p2.results[0].id == 2
        assert p.current_page_number == 2


# ─────────────────────────────────────────────────────────────────────────────
# Paginator — previous_page
# ─────────────────────────────────────────────────────────────────────────────


class TestPaginatorPreviousPage:
    def test_raises_stop_iteration_on_first_page(self) -> None:
        fetcher = MagicMock(return_value=make_page([1]))
        p: Paginator[ContractEvent] = Paginator(fetcher)
        p.next_page()
        with pytest.raises(StopIteration, match="already on the first page"):
            p.previous_page()

    def test_fetches_previous_page(self) -> None:
        fetcher = MagicMock(
            side_effect=[
                make_page([1], next_url=f"{BASE_URL}/api/events/?page=2"),
                make_page([2], previous_url=f"{BASE_URL}/api/events/?page=1"),
                make_page([1]),  # re-fetch page 1
            ]
        )
        p: Paginator[ContractEvent] = Paginator(fetcher)
        p.next_page()  # page 1
        p.next_page()  # page 2
        prev = p.previous_page()  # back to page 1

        assert prev.results[0].id == 1
        assert p.current_page_number == 1
        fetcher.assert_called_with(page=1, page_size=50)


# ─────────────────────────────────────────────────────────────────────────────
# Paginator — go_to_page
# ─────────────────────────────────────────────────────────────────────────────


class TestPaginatorGoToPage:
    def test_raises_value_error_for_page_zero(self) -> None:
        fetcher = MagicMock()
        p: Paginator[ContractEvent] = Paginator(fetcher)
        with pytest.raises(ValueError, match="page_number must be ≥ 1"):
            p.go_to_page(0)

    def test_jumps_to_arbitrary_page(self) -> None:
        page5 = make_page([50, 51, 52])
        fetcher = MagicMock(return_value=page5)
        p: Paginator[ContractEvent] = Paginator(fetcher, page_size=10)

        result = p.go_to_page(5)

        assert result is page5
        fetcher.assert_called_once_with(page=5, page_size=10)
        assert p.current_page_number == 5

    def test_auto_calculates_offset_via_page_number(self) -> None:
        fetcher = MagicMock(return_value=make_page([1]))
        p: Paginator[ContractEvent] = Paginator(fetcher, page_size=25)
        p.go_to_page(3)
        # page=3 means offset 50 (2 * 25), but we pass page directly
        fetcher.assert_called_once_with(page=3, page_size=25)


# ─────────────────────────────────────────────────────────────────────────────
# Paginator — reset
# ─────────────────────────────────────────────────────────────────────────────


class TestPaginatorReset:
    def test_reset_clears_state(self) -> None:
        fetcher = MagicMock(return_value=make_page([1]))
        p: Paginator[ContractEvent] = Paginator(fetcher)
        p.next_page()
        assert p.current_page_number == 1

        p.reset()

        assert p.current_page_number == 0
        assert p.current_page is None
        assert p.has_next_page() is True
        assert p.has_previous_page() is False

    def test_reset_allows_refetch_from_page_1(self) -> None:
        fetcher = MagicMock(return_value=make_page([1]))
        p: Paginator[ContractEvent] = Paginator(fetcher)
        p.next_page()
        p.reset()
        p.next_page()
        assert fetcher.call_count == 2
        fetcher.assert_called_with(page=1, page_size=50)


# ─────────────────────────────────────────────────────────────────────────────
# Paginator — iterator protocol
# ─────────────────────────────────────────────────────────────────────────────


class TestPaginatorIterator:
    def test_iterates_all_pages(self) -> None:
        fetcher = MagicMock(
            side_effect=[
                make_page([1], next_url=f"{BASE_URL}/api/events/?page=2"),
                make_page([2], next_url=f"{BASE_URL}/api/events/?page=3"),
                make_page([3], next_url=None),
            ]
        )
        p: Paginator[ContractEvent] = Paginator(fetcher)
        pages = list(p)
        assert len(pages) == 3
        assert [pg.results[0].id for pg in pages] == [1, 2, 3]


# ─────────────────────────────────────────────────────────────────────────────
# AsyncPaginator
# ─────────────────────────────────────────────────────────────────────────────


class TestAsyncPaginator:
    @pytest.mark.asyncio
    async def test_has_next_page_true_before_first_fetch(self) -> None:
        fetcher = AsyncMock()
        p: AsyncPaginator[ContractEvent] = AsyncPaginator(fetcher)
        assert p.has_next_page() is True

    @pytest.mark.asyncio
    async def test_next_page_fetches_first_page(self) -> None:
        page = make_page([1, 2])
        fetcher = AsyncMock(return_value=page)
        p: AsyncPaginator[ContractEvent] = AsyncPaginator(fetcher, page_size=20)

        result = await p.next_page()

        assert result is page
        fetcher.assert_called_once_with(page=1, page_size=20)

    @pytest.mark.asyncio
    async def test_next_page_raises_when_no_next(self) -> None:
        fetcher = AsyncMock(return_value=make_page([1], next_url=None))
        p: AsyncPaginator[ContractEvent] = AsyncPaginator(fetcher)
        await p.next_page()
        with pytest.raises(StopAsyncIteration, match="no next page"):
            await p.next_page()

    @pytest.mark.asyncio
    async def test_previous_page_raises_on_first_page(self) -> None:
        fetcher = AsyncMock(return_value=make_page([1]))
        p: AsyncPaginator[ContractEvent] = AsyncPaginator(fetcher)
        await p.next_page()
        with pytest.raises(StopAsyncIteration, match="already on the first page"):
            await p.previous_page()

    @pytest.mark.asyncio
    async def test_go_to_page_raises_for_zero(self) -> None:
        fetcher = AsyncMock()
        p: AsyncPaginator[ContractEvent] = AsyncPaginator(fetcher)
        with pytest.raises(ValueError, match="page_number must be ≥ 1"):
            await p.go_to_page(0)

    @pytest.mark.asyncio
    async def test_go_to_page_jumps_correctly(self) -> None:
        page3 = make_page([30, 31])
        fetcher = AsyncMock(return_value=page3)
        p: AsyncPaginator[ContractEvent] = AsyncPaginator(fetcher, page_size=10)

        result = await p.go_to_page(3)

        assert result is page3
        fetcher.assert_called_once_with(page=3, page_size=10)
        assert p.current_page_number == 3

    @pytest.mark.asyncio
    async def test_async_iterator_protocol(self) -> None:
        fetcher = AsyncMock(
            side_effect=[
                make_page([1], next_url=f"{BASE_URL}/api/events/?page=2"),
                make_page([2], next_url=None),
            ]
        )
        p: AsyncPaginator[ContractEvent] = AsyncPaginator(fetcher)
        pages = [page async for page in p]
        assert len(pages) == 2
        assert pages[0].results[0].id == 1
        assert pages[1].results[0].id == 2

    @pytest.mark.asyncio
    async def test_reset_clears_async_state(self) -> None:
        fetcher = AsyncMock(return_value=make_page([1]))
        p: AsyncPaginator[ContractEvent] = AsyncPaginator(fetcher)
        await p.next_page()
        p.reset()
        assert p.current_page_number == 0
        assert p.current_page is None
