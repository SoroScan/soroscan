"""Pytest configuration and fixtures."""

import pytest


@pytest.fixture
def base_url() -> str:
    """Base URL for test API."""
    return "https://api.test.soroscan.io"


@pytest.fixture
def api_key() -> str:
    """Test API key."""
    return "test-api-key-12345"


@pytest.fixture
def sample_contract_data() -> dict:
    """Sample contract response data."""
    return {
        "id": 1,
        "contract_id": "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
        "name": "Test Token",
        "description": "A test token contract",
        "abi_schema": None,
        "is_active": True,
        "last_indexed_ledger": 100000,
        "event_count": 42,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-02T00:00:00Z",
    }


@pytest.fixture
def sample_event_data() -> dict:
    """Sample event response data."""
    return {
        "id": 1,
        "contract_id": "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
        "contract_name": "Test Token",
        "event_type": "transfer",
        "payload": {"from": "GAAA...", "to": "GBBB...", "amount": "1000"},
        "payload_hash": "abc123def456",
        "ledger": 100000,
        "event_index": 0,
        "timestamp": "2026-01-01T12:00:00Z",
        "tx_hash": "tx123456",
        "schema_version": 1,
        "validation_status": "passed",
    }


@pytest.fixture
def sample_webhook_data() -> dict:
    """Sample webhook response data."""
    return {
        "id": 1,
        "contract": 1,
        "contract_id": "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
        "event_type": "transfer",
        "target_url": "https://example.com/webhook",
        "is_active": True,
        "created_at": "2026-01-01T00:00:00Z",
        "last_triggered": None,
        "failure_count": 0,
    }


@pytest.fixture
def sample_paginated_response() -> dict:
    """Sample paginated response structure."""
    return {
        "count": 100,
        "next": "https://api.test.soroscan.io/api/events/?page=2",
        "previous": None,
        "results": [],
    }
