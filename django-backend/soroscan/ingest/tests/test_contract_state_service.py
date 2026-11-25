"""Focused unit coverage for contract state payload helpers (issue #2010)."""

import base64
import gzip
import json

import pytest
from django.test import override_settings

from soroscan.ingest.models import ContractSnapshot, StateChange
from soroscan.ingest.services.contract_state import (
    _truncate_state,
    compute_state_diff,
    decode_state_payload,
    normalize_state_payload,
    should_snapshot_contract,
)

from .factories import TrackedContractFactory


def test_truncate_state_preserves_values_under_budget_and_wraps_non_dict():
    state = {"a": 1, "b": 2}
    assert _truncate_state(state, 100) == state
    assert _truncate_state([1, 2], 1) == {"value": [1, 2]}


def test_truncate_state_keeps_earlier_keys_and_lists_later_oversized_keys():
    assert _truncate_state({"a": 1, "later": "x" * 50, "last": 2}, 12) == {
        "a": 1,
        "_truncated_keys": ["later", "last"],
    }
    assert _truncate_state({"huge": "x" * 100}, 8) == {
        "_truncated_keys": ["huge"]
    }


def test_normalize_state_payload_returns_small_dict_unchanged():
    state = {"balance": 8}
    with override_settings(CONTRACT_SNAPSHOT_MAX_BYTES=100):
        assert normalize_state_payload(state) is state


def test_normalize_state_payload_compresses_or_truncates_to_budget():
    with override_settings(CONTRACT_SNAPSHOT_MAX_BYTES=200):
        compressed = normalize_state_payload({"repeated": "x" * 1000})
    assert compressed["_compressed"] is True
    assert decode_state_payload(compressed) == {"repeated": "x" * 1000}

    with override_settings(CONTRACT_SNAPSHOT_MAX_BYTES=30):
        truncated = normalize_state_payload({"first": 1, "second": "x" * 100})
    assert truncated["_truncated"] is True
    assert "first" in truncated
    assert truncated["_truncated_keys"] == ["second"]
    assert decode_state_payload(truncated) == {"first": 1, "_truncated_keys": ["second"]}


@pytest.mark.parametrize("raw", [b'{"a":1}', '{"a":1}'.encode("utf-8")])
def test_decode_state_payload_decodes_compressed_json_bytes(raw):
    packed = gzip.compress(raw)
    encoded = base64.b64encode(packed).decode()
    assert decode_state_payload({"_compressed": True, "payload": encoded}) == {"a": 1}


def test_decode_state_payload_returns_plain_dict_unchanged():
    state = {"a": 1}
    assert decode_state_payload(state) is state


def test_decode_state_payload_invalid_compressed_json_uses_raw_hex():
    packed = gzip.compress(b"not-json")
    payload = {"_compressed": True, "payload": base64.b64encode(packed).decode()}
    assert decode_state_payload(payload) == {"raw": b"not-json".hex()}


def test_compute_state_diff_reports_insert_delete_and_update():
    assert compute_state_diff(
        {"removed": 1, "changed": 2}, {"added": 3, "changed": 4}
    ) == [
        {"field_name": "added", "old_value": None, "new_value": 3, "change_type": StateChange.ChangeType.INSERT},
        {"field_name": "changed", "old_value": 2, "new_value": 4, "change_type": StateChange.ChangeType.UPDATE},
        {"field_name": "removed", "old_value": 1, "new_value": None, "change_type": StateChange.ChangeType.DELETE},
    ]


@pytest.mark.django_db
def test_should_snapshot_contract_checks_interval_ledger_and_existing_snapshot():
    contract = TrackedContractFactory(last_indexed_ledger=2000)
    assert should_snapshot_contract(contract, interval=1000) is True
    assert should_snapshot_contract(contract, interval=0) is False
    contract.last_indexed_ledger = 0
    assert should_snapshot_contract(contract, interval=1000) is False
    contract.last_indexed_ledger = 2001
    assert should_snapshot_contract(contract, interval=1000) is False
    contract.last_indexed_ledger = 2000
    ContractSnapshot.objects.create(contract=contract, ledger_sequence=2000, state_data={})
    assert should_snapshot_contract(contract, interval=1000) is False
