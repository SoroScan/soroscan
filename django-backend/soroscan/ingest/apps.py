import time

from django.apps import AppConfig


class IngestConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "soroscan.ingest"
    verbose_name = "SoroScan Ingest"

    start_time: float | None = None

    def ready(self):
        import soroscan.ingest.signals  # noqa: F401 — registers signal handlers
        IngestConfig.start_time = time.monotonic()
