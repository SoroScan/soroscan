"""Tests for the process RSS memory gauge (issue #1576)."""

from django.test import TestCase
from prometheus_client import REGISTRY

import soroscan.ingest.telemetry as telemetry


class ProcessMemoryMetricTests(TestCase):
    def test_gauge_is_registered_with_the_expected_name(self):
        # A scrape must find the metric even before the first sample, otherwise
        # alerting rules on it never fire.
        collectors = [
            c for c in REGISTRY.collect() if "process_resident_memory" in c.name
        ]
        self.assertTrue(collectors, "the RSS gauge must be registered")

    def test_update_sets_a_positive_byte_value(self):
        value = telemetry.update_process_memory_metric()

        self.assertIsNotNone(value)
        self.assertGreater(value, 0)
        self.assertEqual(
            REGISTRY.get_sample_value("soroscan_process_resident_memory_bytes"),
            value,
        )

    def test_update_returns_none_when_psutil_is_unavailable(self):
        # The metric is observability only: a missing optional dependency must
        # degrade to None instead of breaking the scrape.
        import builtins

        real_import = builtins.__import__

        def fake_import(name, *args, **kwargs):
            if name == "psutil":
                raise ImportError("psutil not installed")
            return real_import(name, *args, **kwargs)

        builtins.__import__ = fake_import
        try:
            self.assertIsNone(telemetry.update_process_memory_metric())
        finally:
            builtins.__import__ = real_import

    def test_update_never_raises_when_the_platform_refuses(self):
        # psutil.Process(...).memory_info() can raise on restricted platforms;
        # the scrape path must still succeed.
        import psutil

        class Boom:
            def memory_info(self):
                raise RuntimeError("no such process")

        real_process = psutil.Process

        psutil.Process = lambda *a, **kw: Boom()
        try:
            self.assertIsNone(telemetry.update_process_memory_metric())
        finally:
            psutil.Process = real_process
