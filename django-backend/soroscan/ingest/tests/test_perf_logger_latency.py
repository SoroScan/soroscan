"""Tests for the request latency breakdown log (issue #1573)."""

import asyncio
import json
from types import SimpleNamespace

import pytest
from asgiref.sync import sync_to_async
from django.db import connection
from django.http import HttpResponse
from django.test import RequestFactory

from soroscan.perf_logger import SlowQueryLoggerMiddleware


class QueryClock:
    """monotonic() returning explicit values, in call order.

    The middleware calls monotonic once at request start, twice per query
    (start/end) and once at request end. Fixing the values makes the expected
    db/cpu split exact instead of timing-dependent.
    """

    def __init__(self, values):
        self.values = iter(values)
        self.last = 0.0

    def __call__(self):
        try:
            self.last = next(self.values)
        except StopIteration:
            pass
        return self.last


def _freeze_clock(monkeypatch, values):
    """Patch only perf_logger's reference to time.

    Patching ``time.monotonic`` globally would also feed the asyncio event loop
    and any other library that reads the clock, which makes the call order — and
    therefore the expected split — unpredictable.
    """
    monkeypatch.setattr(
        "soroscan.perf_logger.time",
        SimpleNamespace(monotonic=QueryClock(values)),
    )


async def _ok_response(_request):
    # The middleware is async; get_response must be awaitable.
    return HttpResponse("OK", status=200)


def _run_query():
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")


async def _response_with_one_query(_request):
    # sync_to_async so the query runs on Django's thread-sensitive executor,
    # which is also where a real synchronous view would run it.
    await sync_to_async(_run_query)()
    return HttpResponse("OK", status=200)


def _call(middleware, request):
    """Run the async middleware from a synchronous test."""
    return asyncio.run(middleware(request))


def _latency_records(caplog):
    return [r for r in caplog.records if r.name == "django.performance.latency"]


@pytest.fixture
def request_factory():
    return RequestFactory()


@pytest.mark.django_db
def test_slow_request_emits_a_structured_latency_breakdown(
    request_factory, monkeypatch, caplog
):
    """#1573 — a request over 100ms logs db_time_ms and cpu_time_ms as JSON."""
    # request start, query start, query end, request end
    _freeze_clock(monkeypatch, [0.0, 0.01, 0.11, 0.16])

    middleware = SlowQueryLoggerMiddleware(_response_with_one_query)

    with caplog.at_level("INFO", logger="django.performance.latency"):
        _call(middleware, request_factory.get("/api/v1/events/"))

    records = _latency_records(caplog)
    assert records, "a request slower than the threshold must log its breakdown"

    payload = json.loads(records[0].getMessage())
    assert payload["event"] == "request_latency"
    assert payload["method"] == "GET"
    assert payload["path"] == "/api/v1/events/"
    assert payload["status_code"] == 200
    # 100ms in the database, 60ms in Python, 160ms total.
    assert payload["db_time_ms"] == pytest.approx(100.0, abs=0.01)
    assert payload["cpu_time_ms"] == pytest.approx(60.0, abs=0.01)
    assert payload["total_time_ms"] == pytest.approx(160.0, abs=0.01)
    assert payload["query_count"] == 1


@pytest.mark.django_db
def test_fast_request_does_not_emit_a_latency_log(
    request_factory, monkeypatch, caplog
):
    """Under the threshold stays quiet, so the log remains signal not noise."""
    _freeze_clock(monkeypatch, [0.0, 0.02])

    middleware = SlowQueryLoggerMiddleware(_ok_response)

    with caplog.at_level("INFO", logger="django.performance.latency"):
        _call(middleware, request_factory.get("/"))

    assert not _latency_records(caplog)


@pytest.mark.django_db
def test_python_bound_request_is_attributed_to_cpu_time(
    request_factory, monkeypatch, caplog
):
    """A request that is slow outside the database reports a large cpu_time_ms."""
    # request start, query start, query end, request end
    _freeze_clock(monkeypatch, [0.0, 0.005, 0.015, 0.25])

    middleware = SlowQueryLoggerMiddleware(_response_with_one_query)

    with caplog.at_level("INFO", logger="django.performance.latency"):
        _call(middleware, request_factory.get("/api/v1/events/"))

    records = _latency_records(caplog)
    assert records
    payload = json.loads(records[0].getMessage())
    # 10ms of database time out of 250ms: the rest is Python.
    assert payload["db_time_ms"] == pytest.approx(10.0, abs=0.01)
    assert payload["cpu_time_ms"] == pytest.approx(240.0, abs=0.01)
    assert payload["total_time_ms"] == pytest.approx(250.0, abs=0.01)


@pytest.mark.django_db
def test_breakdown_never_reports_negative_cpu_time(
    request_factory, monkeypatch, caplog
):
    """Clock skew between the request and query timers must not produce a
    negative cpu_time_ms."""
    # Query time appears to exceed the total request time.
    _freeze_clock(monkeypatch, [0.0, 0.0, 0.30, 0.20])

    middleware = SlowQueryLoggerMiddleware(_response_with_one_query)

    with caplog.at_level("INFO", logger="django.performance.latency"):
        _call(middleware, request_factory.get("/"))

    records = _latency_records(caplog)
    assert records
    payload = json.loads(records[0].getMessage())
    assert payload["cpu_time_ms"] == 0.0


@pytest.mark.django_db
def test_logging_failure_never_breaks_the_request(request_factory, monkeypatch):
    """A request must not fail because the latency log could not be written."""
    _freeze_clock(monkeypatch, [0.0, 0.01, 0.11, 0.16])

    def boom(*_args, **_kwargs):
        raise RuntimeError("logger exploded")

    monkeypatch.setattr("soroscan.perf_logger.latency_logger.info", boom)

    middleware = SlowQueryLoggerMiddleware(_response_with_one_query)
    response = _call(middleware, request_factory.get("/"))

    assert response.status_code == 200
