"""
Tests for contract identity endpoint.
"""
import pytest
from django.conf import settings
from django.test import override_settings
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestContractIdentityEndpoint:
    """Test contract identity endpoint."""

    def test_endpoint_returns_contract_id(self):
        """Test that endpoint returns the SOROSCAN_CONTRACT_ID."""
        client = APIClient()
        response = client.get("/api/ingest/contract/identity/")
        
        assert response.status_code == 200
        assert "contract_id" in response.data
        assert response.data["contract_id"] == settings.SOROSCAN_CONTRACT_ID

    def test_endpoint_returns_network_passphrase(self):
        """Test that endpoint returns the network passphrase."""
        client = APIClient()
        response = client.get("/api/ingest/contract/identity/")
        
        assert response.status_code == 200
        assert "network_passphrase" in response.data
        assert response.data["network_passphrase"] == settings.STELLAR_NETWORK_PASSPHRASE

    def test_endpoint_returns_rpc_url(self):
        """Test that endpoint returns the RPC URL."""
        client = APIClient()
        response = client.get("/api/ingest/contract/identity/")
        
        assert response.status_code == 200
        assert "rpc_url" in response.data
        assert response.data["rpc_url"] == settings.SOROBAN_RPC_URL

    def test_endpoint_returns_all_required_fields(self):
        """Test that endpoint returns all required fields."""
        client = APIClient()
        response = client.get("/api/ingest/contract/identity/")
        
        assert response.status_code == 200
        assert set(response.data.keys()) == {"contract_id", "network_passphrase", "rpc_url"}

    def test_endpoint_is_publicly_accessible(self):
        """Test that endpoint doesn't require authentication."""
        client = APIClient()
        # No authentication
        response = client.get("/api/ingest/contract/identity/")
        
        assert response.status_code == 200

    @override_settings(
        SOROSCAN_CONTRACT_ID="CTEST123",
        STELLAR_NETWORK_PASSPHRASE="Test Network",
        SOROBAN_RPC_URL="https://test.example.com"
    )
    def test_endpoint_reflects_environment_config(self):
        """Test that endpoint data matches environment configuration."""
        client = APIClient()
        response = client.get("/api/ingest/contract/identity/")
        
        assert response.status_code == 200
        assert response.data["contract_id"] == "CTEST123"
        assert response.data["network_passphrase"] == "Test Network"
        assert response.data["rpc_url"] == "https://test.example.com"

    @override_settings(SOROSCAN_CONTRACT_ID="")
    def test_endpoint_handles_empty_contract_id(self):
        """Test that endpoint handles empty contract ID gracefully."""
        client = APIClient()
        response = client.get("/api/ingest/contract/identity/")
        
        assert response.status_code == 200
        assert response.data["contract_id"] == ""

    def test_endpoint_returns_json(self):
        """Test that endpoint returns JSON content type."""
        client = APIClient()
        response = client.get("/api/ingest/contract/identity/")
        
        assert response.status_code == 200
        assert response["Content-Type"] == "application/json"

    def test_json_structure_is_valid(self):
        """Test that JSON structure is valid and parseable."""
        client = APIClient()
        response = client.get("/api/ingest/contract/identity/")
        
        assert response.status_code == 200
        # Verify it's valid JSON by accessing data
        data = response.json()
        assert isinstance(data, dict)
        assert isinstance(data["contract_id"], str)
        assert isinstance(data["network_passphrase"], str)
        assert isinstance(data["rpc_url"], str)

    def test_endpoint_supports_get_only(self):
        """Test that endpoint only supports GET method."""
        client = APIClient()
        
        # GET should work
        response = client.get("/api/ingest/contract/identity/")
        assert response.status_code == 200
        
        # POST should not be allowed
        response = client.post("/api/ingest/contract/identity/", {})
        assert response.status_code == 405
        
        # PUT should not be allowed
        response = client.put("/api/ingest/contract/identity/", {})
        assert response.status_code == 405
        
        # DELETE should not be allowed
        response = client.delete("/api/ingest/contract/identity/")
        assert response.status_code == 405

    @override_settings(
        SOROSCAN_CONTRACT_ID="CABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234",
        STELLAR_NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015",
        SOROBAN_RPC_URL="https://soroban-mainnet.stellar.org"
    )
    def test_mainnet_configuration(self):
        """Test endpoint with mainnet-like configuration."""
        client = APIClient()
        response = client.get("/api/ingest/contract/identity/")
        
        assert response.status_code == 200
        assert len(response.data["contract_id"]) == 56  # Stellar contract ID length
        assert "Public" in response.data["network_passphrase"]
        assert "mainnet" in response.data["rpc_url"]

    @override_settings(
        SOROSCAN_CONTRACT_ID="CTEST123",
        STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015",
        SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
    )
    def test_testnet_configuration(self):
        """Test endpoint with testnet configuration."""
        client = APIClient()
        response = client.get("/api/ingest/contract/identity/")
        
        assert response.status_code == 200
        assert response.data["contract_id"] == "CTEST123"
        assert "Test" in response.data["network_passphrase"]
        assert "testnet" in response.data["rpc_url"]

    def test_endpoint_caching_behavior(self):
        """Test that endpoint returns consistent data across multiple requests."""
        client = APIClient()
        
        response1 = client.get("/api/ingest/contract/identity/")
        response2 = client.get("/api/ingest/contract/identity/")
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        assert response1.data == response2.data

    def test_endpoint_url_path(self):
        """Test that endpoint is accessible at the correct URL path."""
        client = APIClient()
        
        # Should work with trailing slash
        response = client.get("/api/ingest/contract/identity/")
        assert response.status_code == 200
        
        # Should also work without trailing slash (Django redirects)
        response = client.get("/api/ingest/contract/identity")
        assert response.status_code in [200, 301]
