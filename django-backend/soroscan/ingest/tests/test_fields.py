import json

import pytest
import zstandard as zstd
from django.db import connection
from django.test import TestCase
from soroscan.ingest.fields import CompressedJSONField
from soroscan.ingest.models import ContractEvent
from soroscan.ingest.tests.factories import ContractEventFactory

ZSTD_MAGIC = b"\x28\xb5\x2f\xfd"


class CompressedJSONFieldTest(TestCase):
    def test_empty_dict_serialization(self):
        field = CompressedJSONField()

        empty_dict = {}

        # Test serialization
        compressed = field.get_prep_value(empty_dict)
        self.assertIsNotNone(compressed)
        self.assertNotEqual(compressed, b"{}")

        # Test deserialization
        deserialized = field.from_db_value(compressed, None, None)
        self.assertEqual(deserialized, empty_dict)

        # Test to_python
        to_python_val = field.to_python(compressed)
        self.assertEqual(to_python_val, empty_dict)


# ---------------------------------------------------------------------------
# Issue #2005: cover every branch of CompressedJSONField
# ---------------------------------------------------------------------------

LARGE_PAYLOAD = {
    "events": [
        {"index": i, "amount": i * 7, "memo": f"transfer-{i}"} for i in range(40_000)
    ]
}

ROUND_TRIP_PAYLOADS = [
    pytest.param({"amount": 100, "to": "Bob"}, id="dict"),
    pytest.param([1, "two", 3.0, None, True], id="list"),
    pytest.param({"k": "héllo ✓ 日本 \U0001f680"}, id="unicode"),
    pytest.param(
        {"a": {"b": {"c": [{"d": [1, {"e": "deep"}]}]}}, "f": []}, id="nested"
    ),
    pytest.param([], id="empty-list"),
    pytest.param(LARGE_PAYLOAD, id="large-over-1mb"),
]


def _compress(obj):
    return zstd.ZstdCompressor().compress(json.dumps(obj).encode("utf-8"))


@pytest.fixture
def field():
    return CompressedJSONField()


def test_large_payload_fixture_is_over_one_megabyte():
    assert len(json.dumps(LARGE_PAYLOAD).encode("utf-8")) > 1024 * 1024


class TestGetPrepValue:
    def test_none_passes_through(self, field):
        assert field.get_prep_value(None) is None

    def test_returns_zstd_frame_of_the_json_encoding(self, field):
        payload = {"amount": 100, "to": "Bob"}
        prepared = field.get_prep_value(payload)

        assert isinstance(prepared, bytes)
        assert prepared.startswith(ZSTD_MAGIC)
        decompressed = zstd.ZstdDecompressor().decompress(prepared)
        assert decompressed == json.dumps(payload).encode("utf-8")

    def test_compressed_bytes_are_smaller_than_json_for_repetitive_payload(self, field):
        payload = {"rows": [{"status": "ok", "value": 1}] * 2000}
        raw_json = json.dumps(payload).encode("utf-8")

        prepared = field.get_prep_value(payload)

        assert len(prepared) < len(raw_json) / 10

    def test_non_json_serializable_value_raises_type_error(self, field):
        with pytest.raises(TypeError, match="not JSON serializable"):
            field.get_prep_value({1, 2, 3})


class TestFromDbValue:
    def test_none_passes_through(self, field):
        assert field.from_db_value(None, None, None) is None

    @pytest.mark.parametrize("payload", ROUND_TRIP_PAYLOADS)
    def test_compressed_bytes_round_trip(self, field, payload):
        prepared = field.get_prep_value(payload)
        assert field.from_db_value(prepared, None, None) == payload

    def test_memoryview_of_compressed_bytes_is_decoded(self, field):
        # PostgreSQL's driver returns bytea columns as memoryview.
        payload = {"amount": 100}
        value = memoryview(field.get_prep_value(payload))
        assert field.from_db_value(value, None, None) == payload

    def test_legacy_uncompressed_json_bytes_are_decoded(self, field):
        assert field.from_db_value(b'{"old": "data"}', None, None) == {"old": "data"}

    def test_legacy_uncompressed_json_memoryview_is_decoded(self, field):
        value = memoryview(b'{"old": "data"}')
        assert field.from_db_value(value, None, None) == {"old": "data"}

    def test_json_string_is_decoded(self, field):
        assert field.from_db_value('{"old": [1, 2]}', None, None) == {"old": [1, 2]}

    def test_non_json_string_is_returned_unchanged(self, field):
        assert field.from_db_value("not json", None, None) == "not json"

    @pytest.mark.parametrize(
        "corrupt",
        [
            pytest.param(b"garbage", id="ascii-garbage"),
            pytest.param(b"\xff\xfe\x00", id="invalid-utf8"),
            pytest.param(ZSTD_MAGIC + b"\x00\x01truncated", id="truncated-frame"),
        ],
    )
    def test_corrupt_bytes_are_returned_unchanged(self, field, corrupt):
        assert field.from_db_value(corrupt, None, None) == corrupt

    def test_corrupt_memoryview_is_returned_as_bytes(self, field):
        result = field.from_db_value(memoryview(b"garbage"), None, None)
        assert result == b"garbage"
        assert isinstance(result, bytes)

    def test_valid_zstd_frame_with_non_json_content_is_returned_unchanged(self, field):
        value = zstd.ZstdCompressor().compress(b"not json")
        assert field.from_db_value(value, None, None) == value


class TestToPython:
    def test_json_string_is_decoded(self, field):
        assert field.to_python('{"amount": 100}') == {"amount": 100}

    def test_non_json_string_is_returned_unchanged(self, field):
        assert field.to_python("not json") == "not json"

    @pytest.mark.parametrize("payload", ROUND_TRIP_PAYLOADS)
    def test_zstd_bytes_are_decoded(self, field, payload):
        assert field.to_python(_compress(payload)) == payload

    def test_plain_json_bytes_fall_back_to_json_decoding(self, field):
        assert field.to_python(b'{"old": "data"}') == {"old": "data"}

    @pytest.mark.parametrize(
        "corrupt",
        [
            pytest.param(b"garbage", id="ascii-garbage"),
            pytest.param(b"\xff\xfe\x00", id="invalid-utf8"),
            pytest.param(ZSTD_MAGIC + b"\x00\x01truncated", id="truncated-frame"),
        ],
    )
    def test_corrupt_bytes_are_returned_unchanged(self, field, corrupt):
        assert field.to_python(corrupt) == corrupt

    @pytest.mark.parametrize(
        "decoded", [{"amount": 100}, [1, 2, 3]], ids=["dict", "list"]
    )
    def test_already_decoded_object_is_returned_as_is(self, field, decoded):
        assert field.to_python(decoded) is decoded

    @pytest.mark.parametrize("value", [None, 42, 1.5, True], ids=repr)
    def test_other_values_are_returned_unchanged(self, field, value):
        assert field.to_python(value) is value

    def test_memoryview_is_returned_unchanged_without_decoding(self, field):
        # Unlike from_db_value, to_python does not unwrap memoryview, so the
        # compressed value comes back undecoded. This pins the current behaviour.
        value = memoryview(_compress({"amount": 100}))
        assert field.to_python(value) is value


@pytest.mark.django_db
class TestDatabaseRoundTrip:
    @pytest.mark.parametrize("payload", ROUND_TRIP_PAYLOADS)
    def test_payload_survives_save_and_reload(self, payload):
        event = ContractEventFactory(payload=payload)

        reloaded = ContractEvent.objects.get(pk=event.pk)

        assert reloaded.payload == payload

    def test_payload_is_stored_compressed_in_the_database(self):
        payload = {"rows": [{"status": "ok", "value": 1}] * 2000}
        event = ContractEventFactory(payload=payload)

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT payload FROM ingest_contractevent WHERE id = %s", [event.pk]
            )
            (stored,) = cursor.fetchone()
        stored = bytes(stored)

        assert stored.startswith(ZSTD_MAGIC)
        assert len(stored) < len(json.dumps(payload).encode("utf-8")) / 10
        assert json.loads(zstd.ZstdDecompressor().decompress(stored)) == payload

    def test_legacy_uncompressed_row_is_readable(self):
        event = ContractEventFactory(payload={"placeholder": True})
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE ingest_contractevent SET payload = %s WHERE id = %s",
                [json.dumps({"old": "data"}).encode("utf-8"), event.pk],
            )

        assert ContractEvent.objects.get(pk=event.pk).payload == {"old": "data"}
