"""
SC-8 integration tests: annotated event emission views.

Covers:
  - GET /api/ingest/events/stream/        (SSE event stream)
  - GET /api/ingest/events/count-by-type/ (per-type counts + schema version breakdown)
"""
import json

import pytest
from django.test import RequestFactory
from django.utils import timezone

from soroscan.ingest.models import ContractEvent
from soroscan.ingest.tests.factories import ContractEventFactory, TrackedContractFactory
from soroscan.ingest.views_sc8 import event_count_by_type_view, event_stream_view


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_sse_frames(content: str) -> list[dict]:
    """Parse a raw SSE response body into a list of data dicts."""
    frames = []
    current_data: list[str] = []
    current_event = "event"
    for line in content.splitlines():
        if line.startswith("event:"):
            current_event = line[6:].strip()
        elif line.startswith("data:"):
            current_data.append(line[5:].strip())
        elif line == "":
            if current_data:
                try:
                    parsed = json.loads("\n".join(current_data))
                    parsed["_event_name"] = current_event
                    frames.append(parsed)
                except json.JSONDecodeError:
                    pass
                current_data = []
                current_event = "event"
    return frames


# ---------------------------------------------------------------------------
# event_count_by_type_view tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestEventCountByTypeView:
    def setup_method(self):
        self.factory = RequestFactory()

    def test_returns_zero_counts_when_no_events(self):
        request = self.factory.get("/api/ingest/events/count-by-type/")
        response = event_count_by_type_view(request)
        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["total_events"] == 0
        assert data["counts"] == []
        assert data["contract_id"] is None

    def test_counts_all_event_types(self):
        contract = TrackedContractFactory()
        ContractEventFactory(contract=contract, event_type="swap")
        ContractEventFactory(contract=contract, event_type="swap")
        ContractEventFactory(contract=contract, event_type="transfer")

        request = self.factory.get("/api/ingest/events/count-by-type/")
        response = event_count_by_type_view(request)
        assert response.status_code == 200
        data = json.loads(response.content)

        assert data["total_events"] == 3
        counts_by_type = {e["event_type"]: e["count"] for e in data["counts"]}
        assert counts_by_type["swap"] == 2
        assert counts_by_type["transfer"] == 1

    def test_filters_by_contract_id(self):
        contract_a = TrackedContractFactory()
        contract_b = TrackedContractFactory()
        ContractEventFactory(contract=contract_a, event_type="swap")
        ContractEventFactory(contract=contract_b, event_type="swap")
        ContractEventFactory(contract=contract_b, event_type="mint")

        request = self.factory.get(
            "/api/ingest/events/count-by-type/",
            {"contract_id": contract_a.contract_id},
        )
        response = event_count_by_type_view(request)
        assert response.status_code == 200
        data = json.loads(response.content)

        assert data["contract_id"] == contract_a.contract_id
        assert data["total_events"] == 1
        assert data["counts"][0]["event_type"] == "swap"
        assert data["counts"][0]["count"] == 1

    def test_returns_404_for_unknown_contract(self):
        request = self.factory.get(
            "/api/ingest/events/count-by-type/",
            {"contract_id": "C" + "A" * 55},
        )
        response = event_count_by_type_view(request)
        assert response.status_code == 404

    def test_includes_schema_versions_when_requested(self):
        contract = TrackedContractFactory()
        # Two events with schema_version=1, one with schema_version=2
        ContractEvent.objects.create(
            contract=contract,
            event_type="transfer",
            payload={"a": 1},
            ledger=1001,
            event_index=0,
            timestamp=timezone.now(),
            tx_hash="a" * 64,
            schema_version=1,
        )
        ContractEvent.objects.create(
            contract=contract,
            event_type="transfer",
            payload={"a": 2},
            ledger=1002,
            event_index=1,
            timestamp=timezone.now(),
            tx_hash="b" * 64,
            schema_version=1,
        )
        ContractEvent.objects.create(
            contract=contract,
            event_type="transfer",
            payload={"a": 3},
            ledger=1003,
            event_index=2,
            timestamp=timezone.now(),
            tx_hash="c" * 64,
            schema_version=2,
        )

        request = self.factory.get(
            "/api/ingest/events/count-by-type/",
            {
                "contract_id": contract.contract_id,
                "include_schema_versions": "true",
            },
        )
        response = event_count_by_type_view(request)
        assert response.status_code == 200
        data = json.loads(response.content)

        assert data["total_events"] == 3
        entry = data["counts"][0]
        assert entry["event_type"] == "transfer"
        assert entry["count"] == 3
        assert "schema_versions" in entry

        sv_map = {
            sv["schema_version"]: sv["count"]
            for sv in entry["schema_versions"]
        }
        assert sv_map[1] == 2
        assert sv_map[2] == 1

    def test_schema_versions_not_included_by_default(self):
        contract = TrackedContractFactory()
        ContractEventFactory(contract=contract, event_type="swap")

        request = self.factory.get(
            "/api/ingest/events/count-by-type/",
            {"contract_id": contract.contract_id},
        )
        response = event_count_by_type_view(request)
        data = json.loads(response.content)

        # schema_versions key must not be present when not requested
        for entry in data["counts"]:
            assert "schema_versions" not in entry

    def test_counts_ordered_by_descending_count(self):
        contract = TrackedContractFactory()
        for _ in range(3):
            ContractEventFactory(contract=contract, event_type="swap")
        ContractEventFactory(contract=contract, event_type="transfer")

        request = self.factory.get(
            "/api/ingest/events/count-by-type/",
            {"contract_id": contract.contract_id},
        )
        response = event_count_by_type_view(request)
        data = json.loads(response.content)

        counts = data["counts"]
        # Most frequent type first
        assert counts[0]["event_type"] == "swap"
        assert counts[0]["count"] == 3
        assert counts[1]["event_type"] == "transfer"
        assert counts[1]["count"] == 1

    def test_include_schema_versions_false_string_values(self):
        """Test that '0', 'false', 'no' do not enable schema_versions."""
        contract = TrackedContractFactory()
        ContractEventFactory(contract=contract, event_type="swap")

        for falsy_val in ("false", "0", "no", "False"):
            request = self.factory.get(
                "/api/ingest/events/count-by-type/",
                {
                    "contract_id": contract.contract_id,
                    "include_schema_versions": falsy_val,
                },
            )
            response = event_count_by_type_view(request)
            data = json.loads(response.content)
            for entry in data["counts"]:
                assert "schema_versions" not in entry, (
                    f"schema_versions should not be present for include_schema_versions={falsy_val!r}"
                )


# ---------------------------------------------------------------------------
# event_stream_view tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestEventStreamView:
    def setup_method(self):
        self.factory = RequestFactory()

    def _collect_stream(self, response, max_bytes: int = 65536) -> str:
        """Consume a StreamingHttpResponse up to max_bytes and return as string."""
        chunks = []
        total = 0
        for chunk in response.streaming_content:
            chunks.append(chunk if isinstance(chunk, bytes) else chunk.encode())
            total += len(chunks[-1])
            if total >= max_bytes:
                break
        return b"".join(chunks).decode()

    def test_returns_streaming_response_with_correct_content_type(self):
        request = self.factory.get("/api/ingest/events/stream/")
        response = event_stream_view(request)
        assert response.status_code == 200
        assert "text/event-stream" in response["Content-Type"]
        assert response["Cache-Control"] == "no-cache"

    def test_stream_emits_connected_frame(self):
        request = self.factory.get("/api/ingest/events/stream/")
        response = event_stream_view(request)
        content = self._collect_stream(response)
        frames = _parse_sse_frames(content)

        connected = next(
            (f for f in frames if f.get("_event_name") == "connected"), None
        )
        assert connected is not None, "Expected a 'connected' SSE frame"
        assert "cursor" in connected
        assert "ts" in connected

    def test_stream_includes_existing_events_when_since_id_is_zero_minus_one(self):
        """
        When since_id is explicitly set to a value before all events, those
        events should appear in the stream (we override the default cursor logic).
        """
        contract = TrackedContractFactory()
        ev1 = ContractEventFactory(contract=contract, event_type="swap", ledger=2001)
        ev2 = ContractEventFactory(contract=contract, event_type="transfer", ledger=2002)

        # Use since_id=0 and patch so the default cursor resolves to 0
        # by ensuring all DB events have id > 0 (they do by definition).
        # We set since_id to ev1.id - 1 to pick up ev1 and ev2.
        request = self.factory.get(
            "/api/ingest/events/stream/",
            {"since_id": str(ev1.id - 1)},
        )
        response = event_stream_view(request)
        content = self._collect_stream(response)
        frames = _parse_sse_frames(content)

        event_frames = [f for f in frames if f.get("_event_name") == "event"]
        event_ids = {f["id"] for f in event_frames}
        assert ev1.id in event_ids
        assert ev2.id in event_ids

    def test_stream_filters_by_contract_id(self):
        contract_a = TrackedContractFactory()
        contract_b = TrackedContractFactory()
        ev_a = ContractEventFactory(contract=contract_a, event_type="swap", ledger=3001)
        ContractEventFactory(contract=contract_b, event_type="swap", ledger=3002)

        request = self.factory.get(
            "/api/ingest/events/stream/",
            {
                "since_id": str(ev_a.id - 1),
                "contract_id": contract_a.contract_id,
            },
        )
        response = event_stream_view(request)
        content = self._collect_stream(response)
        frames = _parse_sse_frames(content)

        event_frames = [f for f in frames if f.get("_event_name") == "event"]
        assert all(
            f["contract_id"] == contract_a.contract_id for f in event_frames
        ), "Stream should only contain events for contract_a"

    def test_stream_filters_by_event_type(self):
        contract = TrackedContractFactory()
        ev_swap = ContractEventFactory(
            contract=contract, event_type="swap", ledger=4001
        )
        ContractEventFactory(contract=contract, event_type="transfer", ledger=4002)

        request = self.factory.get(
            "/api/ingest/events/stream/",
            {
                "since_id": str(ev_swap.id - 1),
                "event_type": "swap",
            },
        )
        response = event_stream_view(request)
        content = self._collect_stream(response)
        frames = _parse_sse_frames(content)

        event_frames = [f for f in frames if f.get("_event_name") == "event"]
        assert all(
            f["event_type"] == "swap" for f in event_frames
        ), "Stream should only contain swap events"

    def test_stream_event_frame_contains_required_fields(self):
        contract = TrackedContractFactory()
        ev = ContractEventFactory(contract=contract, event_type="mint", ledger=5001)

        request = self.factory.get(
            "/api/ingest/events/stream/",
            {"since_id": str(ev.id - 1)},
        )
        response = event_stream_view(request)
        content = self._collect_stream(response)
        frames = _parse_sse_frames(content)

        event_frames = [
            f for f in frames if f.get("_event_name") == "event" and f.get("id") == ev.id
        ]
        assert len(event_frames) == 1
        frame = event_frames[0]

        required_keys = {
            "id", "contract_id", "event_type", "payload",
            "ledger", "event_index", "tx_hash", "timestamp",
            "validation_status", "signature_status",
        }
        for key in required_keys:
            assert key in frame, f"Missing required key '{key}' in stream frame"

    def test_stream_invalid_since_id_defaults_gracefully(self):
        """Non-integer since_id should not raise — it defaults to 0."""
        request = self.factory.get(
            "/api/ingest/events/stream/",
            {"since_id": "not-a-number"},
        )
        response = event_stream_view(request)
        # Should still return a streaming response, not a 400/500
        assert response.status_code == 200

    def test_stream_no_xaccel_buffering(self):
        """The X-Accel-Buffering header must be set to disable nginx buffering."""
        request = self.factory.get("/api/ingest/events/stream/")
        response = event_stream_view(request)
        assert response.get("X-Accel-Buffering") == "no"
