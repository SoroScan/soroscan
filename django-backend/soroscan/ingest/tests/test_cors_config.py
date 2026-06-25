import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse

from soroscan import settings as app_settings
from soroscan.ingest.models import Organization, TrackedContract


User = get_user_model()


class TestAllowedOriginsConfiguration:
    def test_single_origin_parsing(self, monkeypatch):
        monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:3000")

        import importlib
        importlib.reload(app_settings)

        assert app_settings.CORS_ALLOWED_ORIGINS == ["http://localhost:3000"]

    def test_multiple_origins_parsing(self, monkeypatch):
        monkeypatch.setenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://localhost:5173,https://app.example.com",
        )

        import importlib
        importlib.reload(app_settings)

        assert app_settings.CORS_ALLOWED_ORIGINS == [
            "http://localhost:3000",
            "http://localhost:5173",
            "https://app.example.com",
        ]

    def test_empty_origins_returns_empty_list(self, monkeypatch):
        monkeypatch.setenv("ALLOWED_ORIGINS", "")

        import importlib
        importlib.reload(app_settings)

        assert app_settings.CORS_ALLOWED_ORIGINS == []

    def test_production_url_parsing(self, monkeypatch):
        monkeypatch.setenv(
            "ALLOWED_ORIGINS",
            "https://soroscan.example.com,https://www.soroscan.example.com",
        )

        import importlib
        importlib.reload(app_settings)

        assert app_settings.CORS_ALLOWED_ORIGINS == [
            "https://soroscan.example.com",
            "https://www.soroscan.example.com",
        ]

    def test_whitespace_handling(self, monkeypatch):
        monkeypatch.setenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000 , https://app.example.com , http://localhost:5173",
        )

        import importlib
        importlib.reload(app_settings)

        assert app_settings.CORS_ALLOWED_ORIGINS == [
            "http://localhost:3000",
            "https://app.example.com",
            "http://localhost:5173",
        ]


@pytest.mark.django_db
class TestPerOrganizationCORS:
    def test_organization_cors_origin_allowed(self):
        user = User.objects.create(username="testuser")
        org = Organization.objects.create(
            name="Test Org",
            slug="test-org",
            owner=user,
            cors_origins=["https://app.testorg.com"],
        )

        client = Client()
        response = client.options(
            reverse("contract-status"),
            HTTP_ORIGIN="https://app.testorg.com",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
        )

        assert response.status_code == 200
        assert response.get("Access-Control-Allow-Origin") == "https://app.testorg.com"

    def test_contract_belongs_to_org_with_allowed_origin(self):
        user = User.objects.create(username="testuser")
        org = Organization.objects.create(
            name="Test Org",
            slug="test-org",
            owner=user,
            cors_origins=["https://app.testorg.com"],
        )
        contract = TrackedContract.objects.create(
            contract_id="C" * 56,
            name="Test Contract",
            owner=user,
            organization=org,
        )

        client = Client()
        response = client.options(
            reverse("contract-event-types", kwargs={"contract_id": contract.contract_id}),
            HTTP_ORIGIN="https://app.testorg.com",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
        )

        assert response.status_code == 200
        assert response.get("Access-Control-Allow-Origin") == "https://app.testorg.com"

    def test_unknown_origin_not_allowed(self):
        user = User.objects.create(username="testuser")
        org = Organization.objects.create(
            name="Test Org",
            slug="test-org",
            owner=user,
            cors_origins=["https://app.testorg.com"],
        )

        client = Client()
        response = client.options(
            reverse("contract-status"),
            HTTP_ORIGIN="https://malicious.com",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
        )

        assert response.get("Access-Control-Allow-Origin") is None
