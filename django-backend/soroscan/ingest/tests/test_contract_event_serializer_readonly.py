import pytest
from django.test import TestCase

from soroscan.ingest.serializers import ContractEventSerializer


class ContractEventSerializerReadOnlyTest(TestCase):
    """SC-30 / Issue #1663: ensure event_index is marked read-only on ContractEventSerializer."""

    def test_event_index_is_read_only(self):
        serializer = ContractEventSerializer()
        self.assertIn("event_index", serializer.fields)
        self.assertTrue(
            serializer.fields["event_index"].read_only,
            "event_index must be a read-only field",
        )

    def test_status_is_read_only(self):
        serializer = ContractEventSerializer()
        self.assertIn("status", serializer.fields)
        self.assertTrue(
            serializer.fields["status"].read_only,
            "status must be a read-only field",
        )
