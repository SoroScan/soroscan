"""
Specification tests for Issue #1609:
fix(sdk-py): add TaggedEventRequest, TaggedEventResponse and MAX_TAGS.
"""

from pathlib import Path
import pytest
from pydantic import ValidationError

REPO_ROOT = Path(__file__).resolve().parent.parent


def test_max_tags_constant_exported():
    """Verify MAX_TAGS is exported and equals 4."""
    import sys
    sys.path.insert(0, str(REPO_ROOT / "sdk" / "python"))

    from soroscan.models import MAX_TAGS as MODELS_MAX_TAGS
    from soroscan import MAX_TAGS as ROOT_MAX_TAGS

    assert MODELS_MAX_TAGS == 4
    assert ROOT_MAX_TAGS == 4


def test_tagged_event_request_validation():
    """Verify TaggedEventRequest model validation and max tags enforcement."""
    import sys
    sys.path.insert(0, str(REPO_ROOT / "sdk" / "python"))
    from soroscan.models import TaggedEventRequest, MAX_TAGS

    # 1. Default tags
    req = TaggedEventRequest(
        contract_id="CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
        event_type="transfer",
        payload_hash="a" * 64,
    )
    assert req.tags == []

    # 2. Within limit
    req2 = TaggedEventRequest(
        contract_id="CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
        event_type="swap",
        payload_hash="a" * 64,
        tags=["a", "b", "c", "d"],
    )
    assert len(req2.tags) == MAX_TAGS

    # 3. Exceeds limit raises ValidationError
    with pytest.raises(ValidationError):
        TaggedEventRequest(
            contract_id="CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
            event_type="swap",
            payload_hash="a" * 64,
            tags=["a", "b", "c", "d", "e"],
        )


def test_tagged_event_response_validation():
    """Verify TaggedEventResponse deserializes response payload correctly."""
    import sys
    sys.path.insert(0, str(REPO_ROOT / "sdk" / "python"))
    from soroscan.models import TaggedEventResponse

    payload = {
        "status": "submitted",
        "tx_hash": "txabcdef123",
        "transaction_status": "PENDING",
        "error": None,
        "tags": ["defi", "dex"],
    }
    resp = TaggedEventResponse.model_validate(payload)
    assert resp.status == "submitted"
    assert resp.tx_hash == "txabcdef123"
    assert resp.tags == ["defi", "dex"]


def test_clients_expose_record_tagged_event():
    """Verify both sync SoroScanClient and async AsyncSoroScanClient expose record_tagged_event."""
    import sys
    sys.path.insert(0, str(REPO_ROOT / "sdk" / "python"))
    from soroscan import SoroScanClient, AsyncSoroScanClient

    assert hasattr(SoroScanClient, "record_tagged_event")
    assert callable(getattr(SoroScanClient, "record_tagged_event"))

    assert hasattr(AsyncSoroScanClient, "record_tagged_event")
    assert callable(getattr(AsyncSoroScanClient, "record_tagged_event"))
