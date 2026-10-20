import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

def get_repo_root() -> Path:
    cur = Path(__file__).resolve()
    for parent in cur.parents:
        if (parent / ".git").exists() or (parent / "pyproject.toml").exists():
            return parent
    raise RuntimeError("Repository root could not be located")

repo_root = get_repo_root()
sdk_python_path = str(repo_root / "sdk" / "python")
if sdk_python_path not in sys.path:
    sys.path.insert(0, sdk_python_path)

from soroscan import AsyncSoroScanClient, AsyncSoroscanClient
from soroscan.models import (
    MAX_TAGS,
    RecordEventResponse,
    StructuredEventRequest,
    TaggedEventRequest,
    TaggedEventResponse,
)


@pytest.mark.asyncio
async def test_async_record_structured_event():
    client = AsyncSoroScanClient(base_url="https://api.soroscan.io")
    mock_response = MagicMock()
    mock_response.status_code = 202
    mock_response.json.return_value = {
        "status": "submitted",
        "tx_hash": "tx_structured_123",
        "transaction_status": "PENDING",
        "error": None,
    }
    client._client.post = AsyncMock(return_value=mock_response)

    res = await client.record_structured_event(
        contract_id="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        event_type="swap",
        payload_hash="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        schema_version=1,
        correlation_id="corr_999",
    )

    assert isinstance(res, RecordEventResponse)
    assert res.status == "submitted"
    assert res.tx_hash == "tx_structured_123"

    # Verify call arguments
    client._client.post.assert_awaited_once()
    call_args, call_kwargs = client._client.post.call_args
    assert call_args[0] == "https://api.soroscan.io/api/record/structured/"
    assert call_kwargs["json"]["correlation_id"] == "corr_999"
    assert call_kwargs["json"]["schema_version"] == 1


@pytest.mark.asyncio
async def test_async_record_tagged_event():
    client = AsyncSoroScanClient(base_url="https://api.soroscan.io")
    mock_response = MagicMock()
    mock_response.status_code = 202
    mock_response.json.return_value = {
        "status": "submitted",
        "tx_hash": "tx_tagged_456",
        "transaction_status": "PENDING",
        "error": None,
        "tags": ["defi", "dex"],
    }
    client._client.post = AsyncMock(return_value=mock_response)

    res = await client.record_tagged_event(
        contract_id="CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
        event_type="transfer",
        payload_hash="fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
        tags=["defi", "dex"],
    )

    assert isinstance(res, TaggedEventResponse)
    assert res.status == "submitted"
    assert res.tx_hash == "tx_tagged_456"
    assert res.tags == ["defi", "dex"]

    # Verify call arguments
    client._client.post.assert_awaited_once()
    call_args, call_kwargs = client._client.post.call_args
    assert call_args[0] == "https://api.soroscan.io/api/record/tagged/"
    assert call_kwargs["json"]["tags"] == ["defi", "dex"]


def test_tagged_event_request_validation():
    # Valid tags up to MAX_TAGS (4)
    req = TaggedEventRequest(
        contract_id="CAAA",
        event_type="mint",
        payload_hash="hash",
        tags=["t1", "t2", "t3", "t4"],
    )
    assert len(req.tags) == MAX_TAGS

    # > 4 tags must raise ValueError / ValidationError
    with pytest.raises(Exception):
        TaggedEventRequest(
            contract_id="CAAA",
            event_type="mint",
            payload_hash="hash",
            tags=["t1", "t2", "t3", "t4", "t5"],
        )


def test_async_soroscan_client_alias_inheritance():
    # Both AsyncSoroScanClient and AsyncSoroscanClient expose the methods
    assert hasattr(AsyncSoroScanClient, "record_structured_event")
    assert hasattr(AsyncSoroScanClient, "record_tagged_event")
    assert hasattr(AsyncSoroscanClient, "record_structured_event")
    assert hasattr(AsyncSoroscanClient, "record_tagged_event")
