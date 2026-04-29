import time

import pytest
from django.conf import settings
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestHealthView:
    def test_health_returns_ok(self, api_client):
        url = reverse("health")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {"status": "ok"}
        assert response["X-SoroScan-Version"] == settings.SOFTWARE_VERSION


@pytest.mark.django_db
class TestReadinessView:
    def test_ready_when_db_and_cache_connected(self, api_client):
        url = reverse("readiness")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {"status": "ready"}
        assert response["X-SoroScan-Version"] == settings.SOFTWARE_VERSION

    def test_not_ready_when_db_fails(self, api_client, monkeypatch):
        from django.db import connection

        def mocked_cursor(*args, **kwargs):
            raise Exception("DB connection failed")

        monkeypatch.setattr(connection, "cursor", lambda: mocked_cursor())

        url = reverse("readiness")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.data["status"] == "not_ready"
        assert any("db" in e for e in response.data["errors"])
        assert response["X-SoroScan-Version"] == settings.SOFTWARE_VERSION

    def test_not_ready_when_cache_fails(self, api_client, monkeypatch):
        def mocked_get(*args, **kwargs):
            raise Exception("Cache connection failed")

        monkeypatch.setattr(cache, "get", mocked_get)

        url = reverse("readiness")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.data["status"] == "not_ready"
        assert any("redis" in e for e in response.data["errors"])
        assert response["X-SoroScan-Version"] == settings.SOFTWARE_VERSION


@pytest.mark.django_db
class TestIngestHealthCheck:
    def test_health_check_returns_healthy(self, api_client):
        url = reverse("health-check")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "healthy"
        assert response.data["service"] == "soroscan"

    def test_health_check_includes_uptime_seconds(self, api_client):
        from soroscan.ingest.apps import IngestConfig

        IngestConfig.start_time = time.monotonic() - 10

        url = reverse("health-check")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "uptime_seconds" in response.data
        assert response.data["uptime_seconds"] >= 10

    def test_health_check_uptime_is_positive(self, api_client):
        from soroscan.ingest.apps import IngestConfig

        IngestConfig.start_time = time.monotonic()

        url = reverse("health-check")
        response = api_client.get(url)

        assert response.data["uptime_seconds"] >= 0

    def test_health_check_includes_human_readable_uptime(self, api_client):
        from soroscan.ingest.apps import IngestConfig

        IngestConfig.start_time = time.monotonic() - 3661

        url = reverse("health-check")
        response = api_client.get(url)

        assert "uptime" in response.data
        assert response.data["uptime"] == "0d 01:01:01"