"""
SC-8 Python SDK tests.

Covers:
  - EmitAnnotatedEventRequest / EmitAnnotatedEventResponse model validation
  - EventCountByTypeResponse / EventTypeCountEntry model validation
  - StreamedEvent model validation
  - SoroScanClient.emit_annotated_event()
  - SoroScanClient.get_event_count_by_type()
  - SoroScanClient.stream_events() (SSE parsing)
  - CLI: events count-by-type subcommand
  - CLI: events watch subcommand (dry-run / signal handling)
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from io import StringIO
from unittest.mock import MagicMock, patch

import pytest

from soroscan.models import (
    EmitAnnotatedEventRequest,
    EmitAnnotatedEventResponse,
    EventCountByTypeResponse,
    EventTypeCountEntry,
    StreamedEvent,
)


# ---------------------------------------------------------------------------
# Model validation tests
# ---------------------------------------------------------------------------

class TestEmitAnnotatedEventRequest:
    def test_valid_construction(self):
        req = EmitAnnotatedEventRequest(
            contract_id="C" + "A" * 55,
            event_type="transfer",
            payload_hash="a" * 64,
            schema_version=1,
        )
        assert req.schema_version == 1
        assert req.event_type == "transfer"

    def test_schema_version_zero_rejected(self):
        with pytest.raises(Exception):
            EmitAnnotatedEventRequest(
                contract_id="C" + "A" * 55,
                event_type="transfer",
                payload_hash="a" * 64,
                schema_version=0,   # must be >= 1
            )

    def test_schema_version_negative_rejected(self):
        with pytest.raises(Exception):
            EmitAnnotatedEventRequest(
                contract_id="C" + "A" * 55,
                event_type="transfer",
                payload_hash="a" * 64,
                schema_version=-1,
            )

    def test_large_schema_version_accepted(self):
        req = EmitAnnotatedEventRequest(
            contract_id="C" + "A" * 55,
            event_type="mint",
            payload_hash="b" * 64,
            schema_version=999,
        )
        assert req.schema_version == 999

    def test_model_dump_contains_all_fields(self):
        req = EmitAnnotatedEventRequest(
            contract_id="C" + "A" * 55,
            event_type="swap",
            payload_hash="c" * 64,
            schema_version=3,
        )
        d = req.model_dump()
        assert d["contract_id"] == "C" + "A" * 55
        assert d["event_type"] == "swap"
        assert d["schema_version"] == 3


class TestEmitAnnotatedEventResponse:
    def test_valid_response(self):
        resp = EmitAnnotatedEventResponse(
            status="submitted",
            total_events=42,
            tx_hash="d" * 64,
            transaction_status="SUCCESS",
            error=None,
        )
        assert resp.total_events == 42
        assert resp.error is None

    def test_failed_response_with_error(self):
        resp = EmitAnnotatedEventResponse(
            status="failed",
            total_events=0,
            tx_hash=None,
            transaction_status=None,
            error="InvalidSchemaVersion",
        )
        assert resp.status == "failed"
        assert resp.error == "InvalidSchemaVersion"


class TestEventCountByTypeResponse:
    def test_empty_counts(self):
        resp = EventCountByTypeResponse(
            contract_id=None,
            total_events=0,
            counts=[],
        )
        assert resp.total_events == 0
        assert resp.counts == []

    def test_multiple_entries(self):
        resp = EventCountByTypeResponse(
            contract_id="C" + "B" * 55,
            total_events=5,
            counts=[
                EventTypeCountEntry(event_type="swap", count=3),
                EventTypeCountEntry(event_type="transfer", count=2),
            ],
        )
        assert len(resp.counts) == 2
        assert resp.counts[0].event_type == "swap"

    def test_schema_versions_optional(self):
        entry = EventTypeCountEntry(event_type="mint", count=10)
        assert entry.schema_versions is None

    def test_schema_versions_populated(self):
        entry = EventTypeCountEntry(
            event_type="burn",
            count=5,
            schema_versions=[
                {"schema_version": 1, "count": 3},
                {"schema_version": 2, "count": 2},
            ],
        )
        assert len(entry.schema_versions) == 2
        assert entry.schema_versions[0]["schema_version"] == 1


class TestStreamedEvent:
    def _make_event(self, **kwargs):
        defaults = {
            "id": 1,
            "contract_id": "C" + "A" * 55,
            "contract_name": "My Contract",
            "event_type": "swap",
            "payload": {"amount": 100},
            "ledger": 12345,
            "event_index": 0,
            "tx_hash": "e" * 64,
            "timestamp": datetime(2026, 1, 1, tzinfo=timezone.utc),
            "schema_version": 2,
            "validation_status": "passed",
            "signature_status": "valid",
        }
        defaults.update(kwargs)
        return StreamedEvent(**defaults)

    def test_valid_construction(self):
        ev = self._make_event()
        assert ev.id == 1
        assert ev.schema_version == 2
        assert ev.event_type == "swap"

    def test_schema_version_none_allowed(self):
        ev = self._make_event(schema_version=None)
        assert ev.schema_version is None

    def test_model_validate_from_dict(self):
        raw = {
            "id": 7,
            "contract_id": "C" + "C" * 55,
            "contract_name": "TokenX",
            "event_type": "transfer",
            "payload": {},
            "ledger": 999,
            "event_index": 1,
            "tx_hash": "f" * 64,
            "timestamp": "2026-03-15T12:00:00+00:00",
            "schema_version": 1,
            "validation_status": "passed",
            "signature_status": "missing",
        }
        ev = StreamedEvent.model_validate(raw)
        assert ev.id == 7
        assert ev.schema_version == 1


# ---------------------------------------------------------------------------
# SoroScanClient method tests (mocked HTTP)
# ---------------------------------------------------------------------------

class TestSoroScanClientSC8:
    def _make_client(self):
        from soroscan.client import SoroScanClient
        return SoroScanClient(
            base_url="http://localhost:8000",
            api_key="test-key",
        )

    def test_emit_annotated_event_success(self):
        client = self._make_client()
        mock_response = MagicMock()
        mock_response.status_code = 202
        mock_response.json.return_value = {
            "status": "submitted",
            "total_events": 5,
            "tx_hash": "abc",
            "transaction_status": "SUCCESS",
            "error": None,
        }

        with patch.object(client._client, "post", return_value=mock_response) as mock_post:
            result = client.emit_annotated_event(
                contract_id="C" + "A" * 55,
                event_type="transfer",
                payload_hash="a" * 64,
                schema_version=2,
            )

        assert result.status == "submitted"
        assert result.total_events == 5
        call_kwargs = mock_post.call_args
        sent_body = call_kwargs.kwargs["json"]
        assert sent_body["schema_version"] == 2
        assert sent_body["event_type"] == "transfer"

    def test_emit_annotated_event_propagates_error_response(self):
        from soroscan.exceptions import SoroScanValidationError
        client = self._make_client()
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            "detail": "schema_version must be >= 1",
            "code": "validation_error",
        }

        with patch.object(client._client, "post", return_value=mock_response):
            with pytest.raises(SoroScanValidationError):
                client.emit_annotated_event(
                    contract_id="C" + "A" * 55,
                    event_type="swap",
                    payload_hash="b" * 64,
                    schema_version=1,
                )

    def test_get_event_count_by_type_no_filters(self):
        client = self._make_client()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "contract_id": None,
            "total_events": 10,
            "counts": [
                {"event_type": "swap", "count": 7},
                {"event_type": "transfer", "count": 3},
            ],
        }

        with patch.object(client._client, "get", return_value=mock_response) as mock_get:
            result = client.get_event_count_by_type()

        assert result.total_events == 10
        assert len(result.counts) == 2
        assert result.counts[0].event_type == "swap"
        # No include_schema_versions param sent
        call_params = mock_get.call_args.kwargs["params"]
        assert "include_schema_versions" not in call_params

    def test_get_event_count_by_type_with_contract_filter(self):
        client = self._make_client()
        cid = "C" + "D" * 55
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "contract_id": cid,
            "total_events": 3,
            "counts": [{"event_type": "mint", "count": 3}],
        }

        with patch.object(client._client, "get", return_value=mock_response) as mock_get:
            result = client.get_event_count_by_type(contract_id=cid)

        assert result.contract_id == cid
        call_params = mock_get.call_args.kwargs["params"]
        assert call_params["contract_id"] == cid

    def test_get_event_count_by_type_with_schema_versions(self):
        client = self._make_client()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "contract_id": None,
            "total_events": 4,
            "counts": [
                {
                    "event_type": "transfer",
                    "count": 4,
                    "schema_versions": [
                        {"schema_version": 1, "count": 3},
                        {"schema_version": 2, "count": 1},
                    ],
                }
            ],
        }

        with patch.object(client._client, "get", return_value=mock_response) as mock_get:
            result = client.get_event_count_by_type(include_schema_versions=True)

        assert result.counts[0].schema_versions is not None
        assert len(result.counts[0].schema_versions) == 2
        call_params = mock_get.call_args.kwargs["params"]
        assert call_params["include_schema_versions"] == "true"

    def test_stream_events_yields_parsed_frames(self):
        """stream_events() should parse SSE frames and yield StreamedEvent objects."""
        client = self._make_client()

        # Build a fake SSE response body
        ts = "2026-07-01T10:00:00+00:00"
        frame1 = {
            "id": 101,
            "contract_id": "C" + "E" * 55,
            "contract_name": "TokenY",
            "event_type": "swap",
            "payload": {"amount": 50},
            "ledger": 8000,
            "event_index": 0,
            "tx_hash": "g" * 64,
            "timestamp": ts,
            "schema_version": 1,
            "validation_status": "passed",
            "signature_status": "valid",
        }
        frame2 = {
            "id": 102,
            "contract_id": "C" + "E" * 55,
            "contract_name": "TokenY",
            "event_type": "transfer",
            "payload": {"to": "Alice"},
            "ledger": 8001,
            "event_index": 1,
            "tx_hash": "h" * 64,
            "timestamp": ts,
            "schema_version": 2,
            "validation_status": "passed",
            "signature_status": "missing",
        }

        def _make_sse(data: dict, event: str = "event") -> str:
            return f"event: {event}\ndata: {json.dumps(data)}\n\n"

        sse_body = (
            _make_sse({"type": "connected", "cursor": 0, "ts": ts}, event="connected")
            + _make_sse(frame1)
            + _make_sse(frame2)
            + _make_sse({"type": "stream_end"}, event="stream_end")
        )

        # Mock the streaming HTTP response
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.iter_lines.return_value = iter(sse_body.splitlines())

        class _FakeStreamCtx:
            def __enter__(self):
                return mock_response
            def __exit__(self, *args):
                pass

        with patch.object(client._client, "stream", return_value=_FakeStreamCtx()):
            events = list(client.stream_events(contract_id="C" + "E" * 55))

        assert len(events) == 2
        assert events[0].id == 101
        assert events[0].event_type == "swap"
        assert events[0].schema_version == 1
        assert events[1].id == 102
        assert events[1].schema_version == 2

    def test_stream_events_skips_non_event_frames(self):
        """Connected and stream_end frames must not be yielded as StreamedEvent."""
        client = self._make_client()
        ts = "2026-07-01T10:00:00+00:00"

        sse_body = (
            "event: connected\ndata: {\"type\": \"connected\", \"cursor\": 0, \"ts\": \"" + ts + "\"}\n\n"
            "event: stream_end\ndata: {\"type\": \"stream_end\"}\n\n"
        )

        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.iter_lines.return_value = iter(sse_body.splitlines())

        class _FakeStreamCtx:
            def __enter__(self):
                return mock_response
            def __exit__(self, *args):
                pass

        with patch.object(client._client, "stream", return_value=_FakeStreamCtx()):
            events = list(client.stream_events())

        assert events == []


# ---------------------------------------------------------------------------
# CLI tests
# ---------------------------------------------------------------------------

class TestCLISC8:
    def _run_cli(self, args: list[str]) -> tuple[int, str]:
        """Run the CLI with the given args and return (exit_code, stdout)."""
        from soroscan.cli import main
        buf = StringIO()
        import sys
        old_stdout = sys.stdout
        sys.stdout = buf
        try:
            exit_code = main(args)
        except SystemExit as exc:
            exit_code = exc.code if isinstance(exc.code, int) else 1
        finally:
            sys.stdout = old_stdout
        return exit_code or 0, buf.getvalue()

    def test_count_by_type_subcommand_exists(self):
        """events count-by-type --help should not raise."""
        from soroscan.cli import build_parser
        parser = build_parser()
        # Parsing --help raises SystemExit(0)
        with pytest.raises(SystemExit) as exc_info:
            parser.parse_args(["events", "count-by-type", "--help"])
        assert exc_info.value.code == 0

    def test_watch_subcommand_exists(self):
        """events watch --help should not raise."""
        from soroscan.cli import build_parser
        parser = build_parser()
        with pytest.raises(SystemExit) as exc_info:
            parser.parse_args(["events", "watch", "--help"])
        assert exc_info.value.code == 0

    def test_count_by_type_json_output(self):
        """events count-by-type --output json should print JSON."""
        mock_response = EventCountByTypeResponse(
            contract_id=None,
            total_events=5,
            counts=[
                EventTypeCountEntry(event_type="swap", count=5),
            ],
        )
        with patch("soroscan.cli._build_client") as mock_build:
            mock_client = MagicMock()
            mock_client.__enter__ = lambda s: mock_client
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.get_event_count_by_type.return_value = mock_response
            mock_build.return_value = mock_client

            exit_code, output = self._run_cli(
                [
                    "--base-url", "http://localhost:8000",
                    "events", "count-by-type",
                    "--output", "json",
                ]
            )

        assert exit_code == 0
        parsed = json.loads(output)
        assert parsed["total_events"] == 5

    def test_count_by_type_table_output(self):
        """events count-by-type (default table) should print total_events header."""
        mock_response = EventCountByTypeResponse(
            contract_id=None,
            total_events=3,
            counts=[
                EventTypeCountEntry(event_type="mint", count=3),
            ],
        )
        with patch("soroscan.cli._build_client") as mock_build:
            mock_client = MagicMock()
            mock_client.__enter__ = lambda s: mock_client
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.get_event_count_by_type.return_value = mock_response
            mock_build.return_value = mock_client

            exit_code, output = self._run_cli(
                [
                    "--base-url", "http://localhost:8000",
                    "events", "count-by-type",
                ]
            )

        assert exit_code == 0
        assert "3" in output  # total events printed
        assert "mint" in output

    def test_watch_subcommand_stops_on_keyboard_interrupt(self):
        """events watch should exit cleanly on KeyboardInterrupt."""
        with patch("soroscan.cli._build_client") as mock_build:
            mock_client = MagicMock()
            mock_client.__enter__ = lambda s: mock_client
            mock_client.__exit__ = MagicMock(return_value=False)
            # Raise KeyboardInterrupt on the first iteration
            mock_client.stream_events.side_effect = KeyboardInterrupt
            mock_build.return_value = mock_client

            exit_code, _ = self._run_cli(
                [
                    "--base-url", "http://localhost:8000",
                    "events", "watch",
                ]
            )

        assert exit_code == 0

    def test_count_by_type_passes_contract_and_schema_flags(self):
        """CLI flags --contract and --schema-versions should be forwarded."""
        cid = "C" + "F" * 55
        mock_response = EventCountByTypeResponse(
            contract_id=cid,
            total_events=2,
            counts=[
                EventTypeCountEntry(
                    event_type="transfer",
                    count=2,
                    schema_versions=[{"schema_version": 1, "count": 2}],
                )
            ],
        )
        with patch("soroscan.cli._build_client") as mock_build:
            mock_client = MagicMock()
            mock_client.__enter__ = lambda s: mock_client
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.get_event_count_by_type.return_value = mock_response
            mock_build.return_value = mock_client

            self._run_cli(
                [
                    "--base-url", "http://localhost:8000",
                    "events", "count-by-type",
                    "--contract", cid,
                    "--schema-versions",
                ]
            )

            mock_client.get_event_count_by_type.assert_called_once_with(
                contract_id=cid,
                include_schema_versions=True,
            )
