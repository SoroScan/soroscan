import json

import zstandard as zstd
from django.test import SimpleTestCase
from soroscan.ingest.fields import CompressedJSONField


class CompressedJSONFieldTest(SimpleTestCase):
    def setUp(self):
        self.field = CompressedJSONField()

    def test_empty_dict_serialization(self):
        empty_dict = {}

        compressed = self.field.get_prep_value(empty_dict)
        self.assertIsNotNone(compressed)
        self.assertNotEqual(compressed, b"{}")

        deserialized = self.field.from_db_value(compressed, None, None)
        self.assertEqual(deserialized, empty_dict)

        to_python_val = self.field.to_python(compressed)
        self.assertEqual(to_python_val, empty_dict)

    def test_get_prep_value_preserves_none(self):
        self.assertIsNone(self.field.get_prep_value(None))

    def test_from_db_value_handles_none_memoryview_and_json_string(self):
        payload = {"key": "value"}
        compressed = zstd.ZstdCompressor().compress(
            json.dumps(payload).encode("utf-8")
        )

        self.assertIsNone(self.field.from_db_value(None, None, None))
        self.assertEqual(
            self.field.from_db_value(memoryview(compressed), None, None), payload
        )
        self.assertEqual(
            self.field.from_db_value(json.dumps(payload), None, None), payload
        )

    def test_from_db_value_falls_back_to_uncompressed_json_bytes(self):
        payload = {"legacy": True}
        raw_json = json.dumps(payload).encode("utf-8")

        self.assertEqual(self.field.from_db_value(raw_json, None, None), payload)

    def test_from_db_value_returns_unrecognized_values_unchanged(self):
        invalid_string = "not json"
        invalid_bytes = b"\xff"

        self.assertEqual(
            self.field.from_db_value(invalid_string, None, None), invalid_string
        )
        self.assertEqual(
            self.field.from_db_value(invalid_bytes, None, None), invalid_bytes
        )

    def test_to_python_handles_json_and_unrecognized_strings(self):
        payload = {"key": "value"}
        invalid_string = "not json"

        self.assertEqual(self.field.to_python(json.dumps(payload)), payload)
        self.assertEqual(self.field.to_python(invalid_string), invalid_string)

    def test_to_python_handles_compressed_legacy_and_invalid_bytes(self):
        payload = {"key": "value"}
        raw_json = json.dumps(payload).encode("utf-8")
        compressed = zstd.ZstdCompressor().compress(raw_json)
        invalid_bytes = b"\xff"

        self.assertEqual(self.field.to_python(compressed), payload)
        self.assertEqual(self.field.to_python(raw_json), payload)
        self.assertEqual(self.field.to_python(invalid_bytes), invalid_bytes)

    def test_to_python_preserves_dict_list_and_other_values(self):
        payload_dict = {"key": "value"}
        payload_list = ["value"]
        other_value = 42

        self.assertIs(self.field.to_python(payload_dict), payload_dict)
        self.assertIs(self.field.to_python(payload_list), payload_list)
        self.assertEqual(self.field.to_python(other_value), other_value)
