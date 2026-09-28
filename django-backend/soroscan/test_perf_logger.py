from unittest.mock import patch

from django.test import TestCase, override_settings, RequestFactory
from django.db import connection
from django.http import HttpResponse

from soroscan.perf_logger import SlowQueryLoggerMiddleware


class MockTimeSlow:
    def __init__(self):
        self.calls = 0

    def __call__(self):
        self.calls += 1
        # First call (start) returns 0.0, second call (end) returns 1.1. Duration = 1.1s
        return 0.0 if self.calls % 2 != 0 else 1.1


class MockTimeFast:
    def __init__(self):
        self.calls = 0

    def __call__(self):
        self.calls += 1
        # First call (start) returns 0.0, second call (end) returns 0.9. Duration = 0.9s
        return 0.0 if self.calls % 2 != 0 else 0.9


class SlowQueryLoggerMiddlewareTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(DATABASE_SLOW_QUERY_THRESHOLD=1.0)
    def test_slow_query_logged(self):
        def get_response(request):
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return HttpResponse("OK")

        middleware = SlowQueryLoggerMiddleware(get_response)
        request = self.factory.get("/")

        with patch("soroscan.perf_logger.time.monotonic", side_effect=MockTimeSlow()):
            with self.assertLogs("django.performance.database", level="WARNING") as cm:
                middleware(request)

        self.assertTrue(any("Slow query detected: SQL" in log for log in cm.output))
        self.assertTrue(any("1.1000s" in log for log in cm.output))

    @override_settings(DATABASE_SLOW_QUERY_THRESHOLD=1.0)
    def test_fast_query_not_logged(self):
        def get_response(request):
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return HttpResponse("OK")

        middleware = SlowQueryLoggerMiddleware(get_response)
        request = self.factory.get("/")

        with patch("soroscan.perf_logger.time.monotonic", side_effect=MockTimeFast()):
            # Using try-except for AssertionError which assertLogs raises when no logs are emitted
            try:
                with self.assertLogs("django.performance.database", level="WARNING"):
                    middleware(request)
            except AssertionError:
                pass
            else:
                self.fail("assertLogs should have raised AssertionError because no logs were expected")
