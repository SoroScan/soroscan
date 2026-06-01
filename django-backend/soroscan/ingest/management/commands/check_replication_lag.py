"""
Django management command for monitoring replication lag.

Usage:
    python manage.py check_replication_lag
    python manage.py check_replication_lag --continuous  # run as daemon
    python manage.py check_replication_lag --interval 30  # check every 30 seconds
"""

import logging
import time
from django.core.management.base import BaseCommand
from django.conf import settings
from soroscan.ingest.replication import get_monitor
from soroscan.ingest import metrics

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Monitor replication lag between primary and replica databases"

    def add_arguments(self, parser):
        parser.add_argument(
            "--continuous",
            action="store_true",
            help="Run continuously as a daemon",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=30,
            help="Check interval in seconds (default: 30)",
        )
        parser.add_argument(
            "--method",
            choices=["lsn", "write-test"],
            default="lsn",
            help="Measurement method: lsn (fast) or write-test (accurate)",
        )

    def handle(self, *args, **options):
        monitor = get_monitor()
        continuous = options["continuous"]
        interval = options["interval"]
        method = options["method"]
        region = getattr(settings, "REGION_NAME", "primary")

        self.stdout.write(
            self.style.SUCCESS(
                f"Starting replication lag monitoring (method={method}, interval={interval}s)"
            )
        )

        if continuous:
            self._run_continuous(monitor, interval, method, region)
        else:
            self._run_once(monitor, method, region)

    def _run_once(self, monitor, method, region):
        """Run a single replication lag check."""
        lag = self._measure_lag(monitor, method)
        self._report_lag(lag, region)

    def _run_continuous(self, monitor, interval, method, region):
        """Run replication lag checks continuously."""
        try:
            while True:
                try:
                    lag = self._measure_lag(monitor, method)
                    self._report_lag(lag, region)
                    alert_info = monitor.check_and_alert(lag)
                    if alert_info:
                        self._handle_alert(alert_info, region)
                except Exception as e:
                    logger.error(f"Error in replication monitoring loop: {e}", exc_info=True)
                    self.stdout.write(self.style.ERROR(f"Error: {e}"))

                time.sleep(interval)
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS("\nReplication monitoring stopped"))

    def _measure_lag(self, monitor, method):
        """Measure replication lag using specified method."""
        if method == "lsn":
            return monitor.measure_lag()
        else:
            return monitor.measure_lag_with_write_test()

    def _report_lag(self, lag, region):
        """Report replication lag and update metrics."""
        metrics.replication_lag_checks_total.labels(region=region, status="success").inc()

        if lag is not None:
            metrics.replication_lag_seconds.labels(region=region).set(lag)
            status = 1 if lag < (getattr(settings, "REPLICATION_LAG_THRESHOLD_SECONDS", 5.0)) else 0
            metrics.replication_status_gauge.labels(region=region).set(status)

            self.stdout.write(
                f"Replication lag: {lag:.3f}s - Status: {self._get_status_text(status)}"
            )
        else:
            self.stdout.write(
                self.style.WARNING("Could not measure replication lag (check logs)")
            )
            metrics.replication_status_gauge.labels(region=region).set(0)

    def _handle_alert(self, alert_info, region):
        """Handle replication lag alert."""
        severity = alert_info["severity"]
        lag = alert_info["lag_seconds"]
        message = alert_info["message"]

        metrics.replication_alerts_total.labels(region=region, severity=severity).inc()

        style_func = (
            self.style.ERROR if severity == "critical" else self.style.WARNING
        )
        self.stdout.write(style_func(f"ALERT [{severity.upper()}]: {message}"))

    def _get_status_text(self, status):
        """Get human-readable status text."""
        return "HEALTHY" if status else "UNHEALTHY"
