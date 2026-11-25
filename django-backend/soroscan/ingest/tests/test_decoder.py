"""
Tests for the contract ABI registry and XDR decoder (issue #58).

Covers:
- ABI JSON validation (meta-schema)
- Successful XDR decoding with a matching ABI
- No-ABI / missing event type / malformed XDR scenarios
- Decoding integration via _upsert_contract_event
"""
from unittest.mock import patch

import pytest
from django.test import TestCase
from stellar_sdk import Keypair, scval

from soroscan.ingest.decoder import (
    _decode_sc_val,
    decode_event_payload,
    validate_abi_json,
)
from soroscan.ingest.models import ContractABI

from .factories import TrackedContractFactory, UserFactory


# ---------------------------------------------------------------------------
# ABI meta-schema validation
# ---------------------------------------------------------------------------

class ValidateABIJsonTest(TestCase):
    """validate_abi_json must accept valid structures and reject invalid ones."""

    def test_valid_abi(self):
        abi = [
            {
                "name": "transfer",
                "fields": [
                    {"name": "from", "type": "Address"},
                    {"name": "to", "type": "Address"},
                    {"name": "amount", "type": "I128"},
                ],
            }
        ]
        # Should not raise
        validate_abi_json(abi)

    def test_empty_list_is_valid(self):
        validate_abi_json([])

    def test_missing_name_raises(self):
        import jsonschema

        bad_abi = [{"fields": [{"name": "x", "type": "I32"}]}]
        with self.assertRaises(jsonschema.ValidationError):
            validate_abi_json(bad_abi)

    def test_bad_type_raises(self):
        import jsonschema

        bad_abi = [
            {
                "name": "evt",
                "fields": [{"name": "x", "type": "NotARealType"}],
            }
        ]
        with self.assertRaises(jsonschema.ValidationError):
            validate_abi_json(bad_abi)

    def test_extra_properties_raises(self):
        import jsonschema

        bad_abi = [
            {
                "name": "evt",
                "fields": [],
                "extra_key": True,
            }
        ]
        with self.assertRaises(jsonschema.ValidationError):
            validate_abi_json(bad_abi)

    def test_not_a_list_raises(self):
        import jsonschema

        with self.assertRaises(jsonschema.ValidationError):
            validate_abi_json({"name": "transfer", "fields": []})


# ---------------------------------------------------------------------------
# decode_event_payload unit tests
# ---------------------------------------------------------------------------

class DecodeEventPayloadTest(TestCase):
    """Unit tests for decode_event_payload (no DB needed)."""

    TRANSFER_ABI = [
        {
            "name": "transfer",
            "fields": [
                {"name": "from", "type": "Address"},
                {"name": "to", "type": "Address"},
                {"name": "amount", "type": "I128"},
            ],
        }
    ]

    SINGLE_FIELD_ABI = [
        {
            "name": "count",
            "fields": [{"name": "value", "type": "I32"}],
        }
    ]

    def test_missing_event_type_returns_none(self):
        """If ABI has no matching event name, return None."""
        result = decode_event_payload("AAAA", self.TRANSFER_ABI, "nonexistent")
        self.assertIsNone(result)

    def test_malformed_xdr_raises(self):
        """Invalid XDR string must raise so the caller can set status=failed."""
        with self.assertLogs("soroscan.ingest.decoder", level="WARNING") as logs:
            with self.assertRaises(Exception):
                decode_event_payload(
                    "not_valid_xdr!!!", self.TRANSFER_ABI, "transfer"
                )
        self.assertIn("Failed to parse XDR for event_type=transfer", logs.output[0])

    def test_sc_val_type_hints_decode_to_python_values(self):
        address = Keypair.random().public_key
        values = [
            ("Address", scval.to_address(address), address),
            ("I128", scval.to_int128(2**127 - 1), 2**127 - 1),
            ("I128", scval.to_int128(-(2**127)), -(2**127)),
            ("U128", scval.to_uint128(0), 0),
            ("U128", scval.to_uint128(2**128 - 1), 2**128 - 1),
            ("I64", scval.to_int64(2**63 - 1), 2**63 - 1),
            ("I64", scval.to_int64(-(2**63)), -(2**63)),
            ("U64", scval.to_uint64(0), 0),
            ("U64", scval.to_uint64(2**64 - 1), 2**64 - 1),
            ("I32", scval.to_int32(2**31 - 1), 2**31 - 1),
            ("I32", scval.to_int32(-(2**31)), -(2**31)),
            ("U32", scval.to_uint32(0), 0),
            ("U32", scval.to_uint32(2**32 - 1), 2**32 - 1),
            ("String", scval.to_string("soroban"), "soroban"),
            ("Bool", scval.to_bool(True), True),
            ("Bool", scval.to_bool(False), False),
            ("Bytes", scval.to_bytes(b"\x00\xff"), "00ff"),
            ("Symbol", scval.to_symbol("swap"), "swap"),
            (
                "Map",
                scval.to_map({scval.to_symbol("amount"): scval.to_int32(7)}),
                {"amount": 7},
            ),
            (
                "Vec",
                scval.to_vec([scval.to_bool(True), scval.to_symbol("nested")]),
                [True, "nested"],
            ),
            ("Map", scval.to_symbol("not_a_map"), "not_a_map"),
            ("Vec", scval.to_symbol("not_a_vec"), "not_a_vec"),
        ]

        for type_hint, sc_val, expected in values:
            with self.subTest(type_hint=type_hint, expected=expected):
                self.assertEqual(_decode_sc_val(sc_val, type_hint), expected)

    def test_unknown_type_hint_uses_generic_native_conversion(self):
        sc_val = scval.to_symbol("fallback")

        self.assertEqual(_decode_sc_val(sc_val, "UnknownType"), "fallback")

    def test_unknown_type_hint_falls_back_to_string_if_native_conversion_fails(self):
        sc_val = scval.to_symbol("fallback")

        with patch(
            "soroscan.ingest.decoder.scval.to_native",
            side_effect=ValueError("cannot decode"),
        ):
            self.assertEqual(
                _decode_sc_val(sc_val, "UnknownType"), str(sc_val)
            )

    def test_mismatched_type_hint_falls_back_to_native_value(self):
        sc_val = scval.to_string("not an integer")

        self.assertEqual(_decode_sc_val(sc_val, "I32"), "not an integer")

    def test_missing_abi_fields_returns_empty_payload(self):
        raw_xdr = scval.to_symbol("noop").to_xdr()

        self.assertEqual(
            decode_event_payload(raw_xdr, [{"name": "noop"}], "noop"), {}
        )

    def test_non_vec_with_multiple_abi_fields_fills_remaining_fields_with_none(self):
        raw_xdr = scval.to_int32(7).to_xdr()
        abi = [
            {
                "name": "event",
                "fields": [
                    {"name": "first", "type": "I32"},
                    {"name": "second", "type": "I32"},
                ],
            }
        ]

        self.assertEqual(
            decode_event_payload(raw_xdr, abi, "event"),
            {"first": 7, "second": None},
        )

    def test_extra_vec_values_are_ignored_when_abi_has_fewer_fields(self):
        raw_xdr = scval.to_vec([scval.to_int32(7), scval.to_int32(8)]).to_xdr()
        abi = [
            {
                "name": "event",
                "fields": [{"name": "first", "type": "I32"}],
            }
        ]

        self.assertEqual(
            decode_event_payload(raw_xdr, abi, "event"), {"first": 7}
        )

    def test_decode_single_i32(self):
        """Single I32 value should decode into the named field."""
        from stellar_sdk import xdr as stellar_xdr

        sc_val = stellar_xdr.SCVal(
            type=stellar_xdr.SCValType.SCV_I32,
            i32=stellar_xdr.Int32(42),
        )
        raw_xdr = sc_val.to_xdr()

        result = decode_event_payload(raw_xdr, self.SINGLE_FIELD_ABI, "count")
        self.assertIsNotNone(result)
        self.assertEqual(result["value"], 42)

    def test_decode_vec_maps_positionally(self):
        """An ScVec should be mapped positionally to ABI fields."""
        from stellar_sdk import xdr as stellar_xdr

        vec_val = stellar_xdr.SCVal(
            type=stellar_xdr.SCValType.SCV_VEC,
            vec=stellar_xdr.SCVec(
                sc_vec=[
                    stellar_xdr.SCVal(
                        type=stellar_xdr.SCValType.SCV_I32,
                        i32=stellar_xdr.Int32(10),
                    ),
                    stellar_xdr.SCVal(
                        type=stellar_xdr.SCValType.SCV_I32,
                        i32=stellar_xdr.Int32(20),
                    ),
                ]
            ),
        )
        raw_xdr = vec_val.to_xdr()

        abi = [
            {
                "name": "pair",
                "fields": [
                    {"name": "a", "type": "I32"},
                    {"name": "b", "type": "I32"},
                ],
            }
        ]
        result = decode_event_payload(raw_xdr, abi, "pair")
        self.assertIsNotNone(result)
        self.assertEqual(result["a"], 10)
        self.assertEqual(result["b"], 20)

    def test_vec_shorter_than_fields(self):
        """Extra ABI fields beyond Vec length should be None."""
        from stellar_sdk import xdr as stellar_xdr

        vec_val = stellar_xdr.SCVal(
            type=stellar_xdr.SCValType.SCV_VEC,
            vec=stellar_xdr.SCVec(
                sc_vec=[
                    stellar_xdr.SCVal(
                        type=stellar_xdr.SCValType.SCV_I32,
                        i32=stellar_xdr.Int32(1),
                    ),
                ]
            ),
        )
        raw_xdr = vec_val.to_xdr()

        abi = [
            {
                "name": "evt",
                "fields": [
                    {"name": "a", "type": "I32"},
                    {"name": "b", "type": "I32"},
                ],
            }
        ]
        result = decode_event_payload(raw_xdr, abi, "evt")
        self.assertEqual(result["a"], 1)
        self.assertIsNone(result["b"])

    def test_empty_fields_returns_empty_dict(self):
        """An event def with no fields should return {}."""
        from stellar_sdk import xdr as stellar_xdr

        sc_val = stellar_xdr.SCVal(
            type=stellar_xdr.SCValType.SCV_I32,
            i32=stellar_xdr.Int32(0),
        )
        raw_xdr = sc_val.to_xdr()

        abi = [{"name": "noop", "fields": []}]
        result = decode_event_payload(raw_xdr, abi, "noop")
        self.assertEqual(result, {})


# ---------------------------------------------------------------------------
# Integration: decoding via _upsert_contract_event
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class UpsertDecodingIntegrationTest(TestCase):
    """_upsert_contract_event should set decoding_status correctly."""

    def setUp(self):
        from django.core.cache import cache
        cache.clear()

    def test_no_abi_sets_no_abi_status(self):
        """Without a ContractABI, status remains 'no_abi'."""
        from soroscan.ingest.tasks import _upsert_contract_event

        user = UserFactory()
        contract = TrackedContractFactory(owner=user)

        obj, created = _upsert_contract_event(
            contract,
            {
                "ledger": 9000,
                "event_index": 0,
                "tx_hash": "nabi_hash",
                "type": "transfer",
                "value": {},
                "timestamp": None,
                "xdr": "",
            },
        )
        self.assertTrue(created)
        obj.refresh_from_db()
        self.assertEqual(obj.decoding_status, "no_abi")
        self.assertIsNone(obj.decoded_payload)

    def test_abi_with_valid_xdr_sets_success(self):
        """With a matching ABI and valid XDR, status should be 'success'."""
        from stellar_sdk import xdr as stellar_xdr
        from soroscan.ingest.tasks import _upsert_contract_event

        user = UserFactory()
        contract = TrackedContractFactory(owner=user)

        # Create ABI with a simple I32 field for 'transfer'
        ContractABI.objects.create(
            contract=contract,
            abi_json=[
                {
                    "name": "transfer",
                    "fields": [{"name": "amount", "type": "I32"}],
                }
            ],
        )

        sc_val = stellar_xdr.SCVal(
            type=stellar_xdr.SCValType.SCV_I32,
            i32=stellar_xdr.Int32(99),
        )

        obj, created = _upsert_contract_event(
            contract,
            {
                "ledger": 9001,
                "event_index": 0,
                "tx_hash": "abi_ok_hash",
                "type": "transfer",
                "value": {},
                "timestamp": None,
                "xdr": sc_val.to_xdr(),
            },
        )
        self.assertTrue(created)
        obj.refresh_from_db()
        self.assertEqual(obj.decoding_status, "success")
        self.assertEqual(obj.decoded_payload["amount"], 99)

    def test_abi_with_bad_xdr_sets_failed(self):
        """ABI exists but XDR is garbage → decoding_status='failed', event still persisted."""
        from soroscan.ingest.tasks import _upsert_contract_event

        user = UserFactory()
        contract = TrackedContractFactory(owner=user)

        ContractABI.objects.create(
            contract=contract,
            abi_json=[
                {
                    "name": "transfer",
                    "fields": [{"name": "amount", "type": "I32"}],
                }
            ],
        )

        obj, created = _upsert_contract_event(
            contract,
            {
                "ledger": 9002,
                "event_index": 0,
                "tx_hash": "bad_xdr_hash",
                "type": "transfer",
                "value": {},
                "timestamp": None,
                "xdr": "DEFINITELY_NOT_XDR",
            },
        )
        self.assertTrue(created)
        obj.refresh_from_db()
        self.assertEqual(obj.decoding_status, "failed")
        self.assertIsNone(obj.decoded_payload)

    def test_abi_no_matching_event_type_sets_failed(self):
        """ABI exists but no matching event name → decoding_status='failed'."""
        from soroscan.ingest.tasks import _upsert_contract_event

        user = UserFactory()
        contract = TrackedContractFactory(owner=user)

        ContractABI.objects.create(
            contract=contract,
            abi_json=[
                {
                    "name": "swap",
                    "fields": [{"name": "value", "type": "I32"}],
                }
            ],
        )

        obj, created = _upsert_contract_event(
            contract,
            {
                "ledger": 9003,
                "event_index": 0,
                "tx_hash": "no_match_hash",
                "type": "transfer",
                "value": {},
                "timestamp": None,
                "xdr": "validxdr",  # doesn't matter, event_type won't match
            },
        )
        self.assertTrue(created)
        obj.refresh_from_db()
        self.assertEqual(obj.decoding_status, "failed")
