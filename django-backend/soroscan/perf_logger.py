import json
import logging
import time
from contextlib import ExitStack

from asgiref.sync import sync_to_async
from django.conf import settings
from django.db import connections
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("django.performance.database")
latency_logger = logging.getLogger("django.performance.latency")

# Requests slower than this get a structured latency breakdown. Read from
# settings at request time (see _latency_threshold) so tests and deployments can
# override it without reimporting the module.
DEFAULT_LATENCY_LOG_THRESHOLD = 0.1


def _latency_threshold() -> float:
    """Seconds above which a request gets a structured latency log entry."""
    return float(
        getattr(
            settings,
            "REQUEST_LATENCY_LOG_THRESHOLD",
            DEFAULT_LATENCY_LOG_THRESHOLD,
        )
    )


def _install_wrappers(make_wrapper):
    """Install execute_wrappers on the current thread's connections.

    Must run on the thread that will execute the queries (see the note in
    ``SlowQueryLoggerMiddleware.__call__``). Returns an ExitStack that removes
    them again; closing it must happen on the same thread.
    """
    stack = ExitStack()
    for alias in connections:
        stack.enter_context(connections[alias].execute_wrapper(make_wrapper(alias)))
    return stack


class SlowQueryLoggerMiddleware(MiddlewareMixin):
    """
    Middleware that monitors and logs database queries exceeding a configurable execution time threshold.
    Uses django.db.connection.execute_wrapper for accurate timing and minimal overhead.

    It also emits a structured JSON latency breakdown for requests slower than
    ``REQUEST_LATENCY_LOG_THRESHOLD`` (default 100ms): total wall time split
    into time spent in the database and time spent in Python. The split is what
    makes the log actionable — a slow request dominated by ``db_time_ms`` is a
    query problem, while one dominated by ``cpu_time_ms`` is a serialization or
    application problem.
    """

    async def __call__(self, request):
        # Dynamically read threshold, defaulting to 1.0 seconds
        threshold = getattr(settings, "DATABASE_SLOW_QUERY_THRESHOLD", 1.0)
        latency_threshold = _latency_threshold()

        # Accumulated across every query in the request and every database
        # alias, so the breakdown covers the whole request rather than the last
        # query only.
        stats = {"db_time": 0.0, "query_count": 0}
        request_start = time.monotonic()

        def make_wrapper(db_alias):
            def _execute_wrapper(execute, sql, params, many, context):
                start_time = time.monotonic()
                try:
                    return execute(sql, params, many, context)
                finally:
                    duration = time.monotonic() - start_time
                    stats["db_time"] += duration
                    stats["query_count"] += 1
                    if duration > threshold:
                        safe_params = str(params)[:1000] if params else ""
                        try:
                            logger.warning(
                                "Slow query detected: SQL [%s] Execution Time: [%.4fs] DB Alias: [%s]",
                                sql,
                                duration,
                                db_alias,
                                extra={
                                    "duration": round(duration, 4),
                                    "sql": sql,
                                    "params": safe_params,
                                    "db_alias": db_alias,
                                },
                            )
                        except Exception:
                            # Never fail the user request due to logging exceptions
                            pass

            return _execute_wrapper

        # Django runs a synchronous view — and every ORM call inside it — on a
        # thread-sensitive executor, i.e. a different thread from this async
        # middleware. ``django.db.connections`` is thread-critical, so a wrapper
        # installed on this thread would never see those queries. Install a
        # second set of wrappers on the executor thread instead, and tear them
        # down there after the response.
        sync_stack = await sync_to_async(_install_wrappers, thread_sensitive=True)(
            make_wrapper
        )
        try:
            response = await self.get_response(request)
        finally:
            await sync_to_async(sync_stack.close, thread_sensitive=True)()

        total_time = time.monotonic() - request_start

        if total_time > latency_threshold:
            # Wall time not spent in the database is attributed to Python. This
            # is the useful split for a latency investigation; it is not a
            # precise CPU measurement, and the name says so. Clamped at zero
            # because the two timers are independent and can skew.
            cpu_time = max(total_time - stats["db_time"], 0.0)
            try:
                latency_logger.info(
                    json.dumps(
                        {
                            "event": "request_latency",
                            "method": getattr(request, "method", None),
                            "path": getattr(request, "path", None),
                            "status_code": getattr(response, "status_code", None),
                            "total_time_ms": round(total_time * 1000, 2),
                            "db_time_ms": round(stats["db_time"] * 1000, 2),
                            "cpu_time_ms": round(cpu_time * 1000, 2),
                            "query_count": stats["query_count"],
                            "threshold_ms": round(latency_threshold * 1000, 2),
                        }
                    )
                )
            except Exception:
                # Never fail the user request due to logging exceptions
                pass

        return response
