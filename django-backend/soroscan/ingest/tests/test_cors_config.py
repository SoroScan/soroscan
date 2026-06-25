from soroscan import settings as app_settings


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


import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import override_settings
from rest_framework.test import APIClient
from soroscan.ingest.models import Organization

User = get_user_model()


@pytest.mark.django_db
class TestOrganizationCorsConfiguration:
    @pytest.fixture(autouse=True)
    def setup_method(self):
        self.user = User.objects.create_user(username="testuser", password="password")
        self.client = APIClient()

    @override_settings(CORS_ALLOW_ALL_ORIGINS=False, CORS_ALLOWED_ORIGINS=[])
    def test_cors_allowed_for_org_origin(self):
        # Create organization with allowed origin
        Organization.objects.create(
            name="Test Org",
            owner=self.user,
            cors_origins=["https://allowed-org-origin.com"]
        )

        # Make request with allowed origin
        response = self.client.get(
            "/api/ingest/health/",
            HTTP_ORIGIN="https://allowed-org-origin.com"
        )
        assert response.status_code == 200
        assert response.headers.get("Access-Control-Allow-Origin") == "https://allowed-org-origin.com"

    @override_settings(CORS_ALLOW_ALL_ORIGINS=False, CORS_ALLOWED_ORIGINS=[])
    def test_cors_denied_for_unknown_origin(self):
        # Create organization with allowed origin
        Organization.objects.create(
            name="Test Org",
            owner=self.user,
            cors_origins=["https://allowed-org-origin.com"]
        )

        # Make request with unknown origin
        response = self.client.get(
            "/api/ingest/health/",
            HTTP_ORIGIN="https://unknown-origin.com"
        )
        assert response.status_code == 200
        assert "Access-Control-Allow-Origin" not in response.headers

    @override_settings(CORS_ALLOW_ALL_ORIGINS=False, CORS_ALLOWED_ORIGINS=[])
    def test_cors_with_multiple_organizations(self):
        # Create org 1
        Organization.objects.create(
            name="Org 1",
            owner=self.user,
            cors_origins=["https://org1-origin.com"]
        )
        # Create org 2
        Organization.objects.create(
            name="Org 2",
            owner=self.user,
            cors_origins=["https://org2-origin.com"]
        )

        # Test org 1 origin
        response1 = self.client.get(
            "/api/ingest/health/",
            HTTP_ORIGIN="https://org1-origin.com"
        )
        assert response1.headers.get("Access-Control-Allow-Origin") == "https://org1-origin.com"

        # Test org 2 origin
        response2 = self.client.get(
            "/api/ingest/health/",
            HTTP_ORIGIN="https://org2-origin.com"
        )
        assert response2.headers.get("Access-Control-Allow-Origin") == "https://org2-origin.com"

    def test_invalid_cors_origins_type_raises_validation_error(self):
        with pytest.raises(ValidationError):
            org = Organization(
                name="Invalid Org",
                owner=self.user,
                cors_origins="not-a-list"
            )
            org.save()

    def test_invalid_cors_origins_elements_raises_validation_error(self):
        with pytest.raises(ValidationError):
            org = Organization(
                name="Invalid Org",
                owner=self.user,
                cors_origins=["https://valid.com", 123]
            )
            org.save()