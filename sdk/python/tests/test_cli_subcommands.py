"""Tests for new CLI subcommands: indexer-check, admin, contract-status, and indexer-stats."""

import io
import json
import sys
from unittest.mock import MagicMock, patch

import pytest

from soroscan.cli import build_parser, main
from soroscan.models import (
    ContractStatus,
    GetAdminResponse,
    IndexerStats,
    IsIndexerResponse,
)


class TestCliParserSubcommands:
    """Verify build_parser arguments and help text for new subcommands."""

    def test_help_includes_all_new_subcommands(self):
        parser = build_parser()
        help_text = parser.format_help()
        assert "indexer-check" in help_text
        assert "admin" in help_text
        assert "contract-status" in help_text
        assert "indexer-stats" in help_text

    def test_indexer_check_parser_args(self):
        parser = build_parser()
        args = parser.parse_args(["indexer-check", "GB3SRMOGPKYI5RC7KMCZGXTGGMNBA6OOS3AX7XTJLTDSYOS62PFTKT5B"])
        assert args.command == "indexer-check"
        assert args.indexer_address == "GB3SRMOGPKYI5RC7KMCZGXTGGMNBA6OOS3AX7XTJLTDSYOS62PFTKT5B"
        assert args.output == "table"

        args_json = parser.parse_args([
            "indexer-check",
            "GB3SRMOGPKYI5RC7KMCZGXTGGMNBA6OOS3AX7XTJLTDSYOS62PFTKT5B",
            "--output",
            "json",
        ])
        assert args_json.output == "json"

    def test_indexer_check_missing_address_exits(self):
        parser = build_parser()
        with pytest.raises(SystemExit):
            parser.parse_args(["indexer-check"])

    def test_admin_parser_args(self):
        parser = build_parser()
        args = parser.parse_args(["admin"])
        assert args.command == "admin"
        assert args.output == "table"

        args_json = parser.parse_args(["admin", "--output", "json"])
        assert args_json.output == "json"

    def test_contract_status_parser_args(self):
        parser = build_parser()
        args = parser.parse_args(["contract-status"])
        assert args.command == "contract-status"
        assert args.output == "table"

        args_json = parser.parse_args(["contract-status", "--output", "json"])
        assert args_json.output == "json"

    def test_indexer_stats_parser_args(self):
        parser = build_parser()
        args = parser.parse_args(["indexer-stats", "GB3SRMOGPKYI5RC7KMCZGXTGGMNBA6OOS3AX7XTJLTDSYOS62PFTKT5B"])
        assert args.command == "indexer-stats"
        assert args.indexer_address == "GB3SRMOGPKYI5RC7KMCZGXTGGMNBA6OOS3AX7XTJLTDSYOS62PFTKT5B"
        assert args.output == "table"

    def test_indexers_nested_subcommands(self):
        parser = build_parser()
        check_args = parser.parse_args(["indexers", "check", "GADDR123"])
        assert check_args.command == "indexers"
        assert check_args.indexer_command == "check"
        assert check_args.indexer_address == "GADDR123"

        stats_args = parser.parse_args(["indexers", "stats", "GADDR456"])
        assert stats_args.command == "indexers"
        assert stats_args.indexer_command == "stats"
        assert stats_args.indexer_address == "GADDR456"


class TestCliExecution:
    """Verify execution of new CLI subcommands and wiring to client methods."""

    def test_indexer_check_execution_json(self, monkeypatch):
        mock_response = IsIndexerResponse(is_indexer=True)
        with patch("soroscan.cli.SoroScanClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__.return_value = mock_client
            mock_client.is_indexer.return_value = mock_response
            mock_client_cls.return_value = mock_client

            stdout = io.StringIO()
            monkeypatch.setattr(sys, "stdout", stdout)

            code = main(["indexer-check", "GADDR123", "--output", "json"])

            assert code == 0
            mock_client.is_indexer.assert_called_once_with("GADDR123")
            data = json.loads(stdout.getvalue())
            assert data["is_indexer"] is True

    def test_indexer_check_execution_table(self, monkeypatch):
        mock_response = IsIndexerResponse(is_indexer=False)
        with patch("soroscan.cli.SoroScanClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__.return_value = mock_client
            mock_client.is_indexer.return_value = mock_response
            mock_client_cls.return_value = mock_client

            stdout = io.StringIO()
            monkeypatch.setattr(sys, "stdout", stdout)

            code = main(["indexer-check", "GADDR123"])

            assert code == 0
            output = stdout.getvalue()
            assert "is_indexer" in output
            assert "False" in output

    def test_indexers_check_execution(self, monkeypatch):
        mock_response = IsIndexerResponse(is_indexer=True)
        with patch("soroscan.cli.SoroScanClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__.return_value = mock_client
            mock_client.is_indexer.return_value = mock_response
            mock_client_cls.return_value = mock_client

            stdout = io.StringIO()
            monkeypatch.setattr(sys, "stdout", stdout)

            code = main(["indexers", "check", "GADDR123", "--output", "json"])

            assert code == 0
            mock_client.is_indexer.assert_called_once_with("GADDR123")
            data = json.loads(stdout.getvalue())
            assert data["is_indexer"] is True

    def test_admin_execution_json(self, monkeypatch):
        mock_response = GetAdminResponse(admin_address="GADMINADDRESS123")
        with patch("soroscan.cli.SoroScanClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__.return_value = mock_client
            mock_client.get_admin.return_value = mock_response
            mock_client_cls.return_value = mock_client

            stdout = io.StringIO()
            monkeypatch.setattr(sys, "stdout", stdout)

            code = main(["admin", "--output", "json"])

            assert code == 0
            mock_client.get_admin.assert_called_once()
            data = json.loads(stdout.getvalue())
            assert data["admin_address"] == "GADMINADDRESS123"

    def test_admin_execution_table(self, monkeypatch):
        mock_response = GetAdminResponse(admin_address="GADMINADDRESS123")
        with patch("soroscan.cli.SoroScanClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__.return_value = mock_client
            mock_client.get_admin.return_value = mock_response
            mock_client_cls.return_value = mock_client

            stdout = io.StringIO()
            monkeypatch.setattr(sys, "stdout", stdout)

            code = main(["admin"])

            assert code == 0
            output = stdout.getvalue()
            assert "admin_address" in output
            assert "GADMINADDRESS123" in output

    def test_contract_status_execution_json(self, monkeypatch):
        mock_response = ContractStatus(
            paused=False,
            admin="GADMINADDRESS123",
            total_events=1234,
        )
        with patch("soroscan.cli.SoroScanClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__.return_value = mock_client
            mock_client.get_contract_status.return_value = mock_response
            mock_client_cls.return_value = mock_client

            stdout = io.StringIO()
            monkeypatch.setattr(sys, "stdout", stdout)

            code = main(["contract-status", "--output", "json"])

            assert code == 0
            mock_client.get_contract_status.assert_called_once()
            data = json.loads(stdout.getvalue())
            assert data["paused"] is False
            assert data["admin"] == "GADMINADDRESS123"
            assert data["total_events"] == 1234

    def test_contract_status_execution_table(self, monkeypatch):
        mock_response = ContractStatus(
            paused=True,
            admin="GADMINADDRESS123",
            total_events=5678,
        )
        with patch("soroscan.cli.SoroScanClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__.return_value = mock_client
            mock_client.get_contract_status.return_value = mock_response
            mock_client_cls.return_value = mock_client

            stdout = io.StringIO()
            monkeypatch.setattr(sys, "stdout", stdout)

            code = main(["contract-status"])

            assert code == 0
            output = stdout.getvalue()
            assert "paused" in output
            assert "True" in output
            assert "total_events" in output
            assert "5678" in output

    def test_indexer_stats_execution_json(self, monkeypatch):
        mock_response = IndexerStats(
            indexer="GINDEXERADDRESS123",
            events_recorded=88,
        )
        with patch("soroscan.cli.SoroScanClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__.return_value = mock_client
            mock_client.get_indexer_stats.return_value = mock_response
            mock_client_cls.return_value = mock_client

            stdout = io.StringIO()
            monkeypatch.setattr(sys, "stdout", stdout)

            code = main(["indexer-stats", "GINDEXERADDRESS123", "--output", "json"])

            assert code == 0
            mock_client.get_indexer_stats.assert_called_once_with("GINDEXERADDRESS123")
            data = json.loads(stdout.getvalue())
            assert data["indexer"] == "GINDEXERADDRESS123"
            assert data["events_recorded"] == 88

    def test_indexers_stats_execution(self, monkeypatch):
        mock_response = IndexerStats(
            indexer="GINDEXERADDRESS123",
            events_recorded=88,
        )
        with patch("soroscan.cli.SoroScanClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__.return_value = mock_client
            mock_client.get_indexer_stats.return_value = mock_response
            mock_client_cls.return_value = mock_client

            stdout = io.StringIO()
            monkeypatch.setattr(sys, "stdout", stdout)

            code = main(["indexers", "stats", "GINDEXERADDRESS123", "--output", "json"])

            assert code == 0
            mock_client.get_indexer_stats.assert_called_once_with("GINDEXERADDRESS123")
            data = json.loads(stdout.getvalue())
            assert data["indexer"] == "GINDEXERADDRESS123"
            assert data["events_recorded"] == 88
