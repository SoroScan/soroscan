"""
Pagination helper classes for the SoroScan Python SDK.

Issue #483 — feat: add pagination helper methods to both SDKs

Provides ``Paginator`` (sync) and ``AsyncPaginator`` (async) that wrap any
SoroScan list method and expose:

- ``has_next_page()``   — check if more results exist
- ``next_page()``       — fetch the next page automatically
- ``previous_page()``  — go back one page
- ``go_to_page(n)``    — jump to a specific 1-indexed page

Both classes auto-calculate offsets from the ``next`` / ``previous`` URL
fields returned by the API, so callers never have to manage page numbers
manually.

Example (sync)::

    from soroscan import SoroScanClient
    from soroscan.pagination import Paginator

    client = SoroScanClient(base_url="https://api.soroscan.io", api_key="...")

    paginator = Paginator(
        fetcher=client.get_events,
        contract_id="CCAAA...",
        page_size=20,
    )

    page1 = paginator.next_page()
    if paginator.has_next_page():
        page2 = paginator.next_page()

    page5 = paginator.go_to_page(5)
    page4 = paginator.previous_page()

Example (async)::

    from soroscan import AsyncSoroScanClient
    from soroscan.pagination import AsyncPaginator

    async with AsyncSoroScanClient(...) as client:
        paginator = AsyncPaginator(client.get_events, page_size=20)
        page1 = await paginator.next_page()
"""

from __future__ import annotations

from typing import Any, Callable, Awaitable, Generic, TypeVar

from soroscan.models import PaginatedResponse

T = TypeVar("T")

# Type aliases for the fetcher callables
SyncFetcher = Callable[..., PaginatedResponse[T]]
AsyncFetcher = Callable[..., Awaitable[PaginatedResponse[T]]]


class Paginator(Generic[T]):
    """
    Synchronous page-based paginator for SoroScan list endpoints.

    Wraps any client method that accepts ``page`` and ``page_size`` keyword
    arguments and returns a :class:`~soroscan.models.PaginatedResponse`.

    Args:
        fetcher: A bound client method, e.g. ``client.get_events``.
        page_size: Number of results per page (default 50).
        **base_kwargs: Extra keyword arguments forwarded to every ``fetcher``
            call (e.g. ``contract_id="CCAAA..."``, ``event_type="transfer"``).

    Example::

        paginator = Paginator(client.get_events, contract_id="CCAAA...", page_size=20)
        page1 = paginator.next_page()
        page2 = paginator.next_page()
        page1_again = paginator.go_to_page(1)
    """

    def __init__(
        self,
        fetcher: SyncFetcher[T],
        page_size: int = 50,
        **base_kwargs: Any,
    ) -> None:
        self._fetcher = fetcher
        self._page_size = page_size
        self._base_kwargs = base_kwargs

        self._current_page: PaginatedResponse[T] | None = None
        self._current_page_number: int = 0

    # ─── State queries ────────────────────────────────────────────────────────

    def has_next_page(self) -> bool:
        """
        Return ``True`` if there is a next page available.

        Always returns ``True`` before the first fetch (no data loaded yet).
        """
        if self._current_page is None:
            return True
        return self._current_page.next is not None

    def has_previous_page(self) -> bool:
        """Return ``True`` if there is a previous page available."""
        if self._current_page is None:
            return False
        return self._current_page.previous is not None

    @property
    def current_page_number(self) -> int:
        """The 1-indexed number of the currently loaded page, or 0 if none."""
        return self._current_page_number

    @property
    def current_page(self) -> PaginatedResponse[T] | None:
        """The most recently fetched page, or ``None`` before the first fetch."""
        return self._current_page

    # ─── Navigation ──────────────────────────────────────────────────────────

    def next_page(self) -> PaginatedResponse[T]:
        """
        Fetch and return the next page.

        Raises:
            StopIteration: If there is no next page.
        """
        if self._current_page is not None and not self.has_next_page():
            raise StopIteration("Paginator: no next page available")

        next_page_number = self._current_page_number + 1
        result = self._fetcher(
            page=next_page_number,
            page_size=self._page_size,
            **self._base_kwargs,
        )
        self._current_page = result
        self._current_page_number = next_page_number
        return result

    def previous_page(self) -> PaginatedResponse[T]:
        """
        Fetch and return the previous page.

        Raises:
            StopIteration: If already on the first page.
        """
        if self._current_page_number <= 1:
            raise StopIteration("Paginator: already on the first page")

        prev_page_number = self._current_page_number - 1
        result = self._fetcher(
            page=prev_page_number,
            page_size=self._page_size,
            **self._base_kwargs,
        )
        self._current_page = result
        self._current_page_number = prev_page_number
        return result

    def go_to_page(self, page_number: int) -> PaginatedResponse[T]:
        """
        Jump to a specific 1-indexed page number.

        The offset is auto-calculated from ``page_number`` and ``page_size``.

        Args:
            page_number: Target page (must be ≥ 1).

        Raises:
            ValueError: If ``page_number`` is less than 1.
        """
        if page_number < 1:
            raise ValueError("Paginator: page_number must be ≥ 1")

        result = self._fetcher(
            page=page_number,
            page_size=self._page_size,
            **self._base_kwargs,
        )
        self._current_page = result
        self._current_page_number = page_number
        return result

    def reset(self) -> None:
        """Reset the paginator to its initial state."""
        self._current_page = None
        self._current_page_number = 0

    # ─── Iterator protocol ───────────────────────────────────────────────────

    def __iter__(self) -> "Paginator[T]":
        self.reset()
        return self

    def __next__(self) -> PaginatedResponse[T]:
        if self._current_page is not None and not self.has_next_page():
            raise StopIteration
        return self.next_page()


class AsyncPaginator(Generic[T]):
    """
    Asynchronous page-based paginator for SoroScan list endpoints.

    Identical API to :class:`Paginator` but all navigation methods are
    coroutines.

    Args:
        fetcher: A bound async client method, e.g. ``async_client.get_events``.
        page_size: Number of results per page (default 50).
        **base_kwargs: Extra keyword arguments forwarded to every ``fetcher``
            call.

    Example::

        paginator = AsyncPaginator(client.get_events, contract_id="CCAAA...", page_size=20)
        page1 = await paginator.next_page()
        page2 = await paginator.next_page()
    """

    def __init__(
        self,
        fetcher: AsyncFetcher[T],
        page_size: int = 50,
        **base_kwargs: Any,
    ) -> None:
        self._fetcher = fetcher
        self._page_size = page_size
        self._base_kwargs = base_kwargs

        self._current_page: PaginatedResponse[T] | None = None
        self._current_page_number: int = 0

    # ─── State queries ────────────────────────────────────────────────────────

    def has_next_page(self) -> bool:
        """Return ``True`` if there is a next page available."""
        if self._current_page is None:
            return True
        return self._current_page.next is not None

    def has_previous_page(self) -> bool:
        """Return ``True`` if there is a previous page available."""
        if self._current_page is None:
            return False
        return self._current_page.previous is not None

    @property
    def current_page_number(self) -> int:
        """The 1-indexed number of the currently loaded page, or 0 if none."""
        return self._current_page_number

    @property
    def current_page(self) -> PaginatedResponse[T] | None:
        """The most recently fetched page, or ``None`` before the first fetch."""
        return self._current_page

    # ─── Navigation ──────────────────────────────────────────────────────────

    async def next_page(self) -> PaginatedResponse[T]:
        """
        Fetch and return the next page.

        Raises:
            StopAsyncIteration: If there is no next page.
        """
        if self._current_page is not None and not self.has_next_page():
            raise StopAsyncIteration("AsyncPaginator: no next page available")

        next_page_number = self._current_page_number + 1
        result = await self._fetcher(
            page=next_page_number,
            page_size=self._page_size,
            **self._base_kwargs,
        )
        self._current_page = result
        self._current_page_number = next_page_number
        return result

    async def previous_page(self) -> PaginatedResponse[T]:
        """
        Fetch and return the previous page.

        Raises:
            StopAsyncIteration: If already on the first page.
        """
        if self._current_page_number <= 1:
            raise StopAsyncIteration("AsyncPaginator: already on the first page")

        prev_page_number = self._current_page_number - 1
        result = await self._fetcher(
            page=prev_page_number,
            page_size=self._page_size,
            **self._base_kwargs,
        )
        self._current_page = result
        self._current_page_number = prev_page_number
        return result

    async def go_to_page(self, page_number: int) -> PaginatedResponse[T]:
        """
        Jump to a specific 1-indexed page number.

        Args:
            page_number: Target page (must be ≥ 1).

        Raises:
            ValueError: If ``page_number`` is less than 1.
        """
        if page_number < 1:
            raise ValueError("AsyncPaginator: page_number must be ≥ 1")

        result = await self._fetcher(
            page=page_number,
            page_size=self._page_size,
            **self._base_kwargs,
        )
        self._current_page = result
        self._current_page_number = page_number
        return result

    def reset(self) -> None:
        """Reset the paginator to its initial state."""
        self._current_page = None
        self._current_page_number = 0

    # ─── Async iterator protocol ─────────────────────────────────────────────

    def __aiter__(self) -> "AsyncPaginator[T]":
        self.reset()
        return self

    async def __anext__(self) -> PaginatedResponse[T]:
        if self._current_page is not None and not self.has_next_page():
            raise StopAsyncIteration
        return await self.next_page()
