"""Tests for check_integrity management command."""
from io import StringIO

import pytest
from django.core.management import call_command
from django.test import TestCase

from soroscan.ingest.tests.factories import ContractEventFactory, TrackedContractFactory


class TestCheckIntegrityCommand(TestCase):
    """Test suite for the check_integrity management command."""

    def setUp(self):
        """Set up test fixtures."""
        self.contract = TrackedContractFactory()
        self.out = StringIO()

    def test_no_events(self):
        """Test command output when no events exist."""
        call_command("check_integrity", stdout=self.out)
        output = self.out.getvalue()
        self.assertIn("No events found", output)

    def test_continuous_ledger_sequence(self):
        """Test detection of continuous ledger sequence with no gaps."""
        # Create events with continuous ledger sequence 1000-1005
        for i in range(6):
            ContractEventFactory(contract=self.contract, ledger=1000 + i)

        call_command("check_integrity", stdout=self.out)
        output = self.out.getvalue()

        self.assertIn("✓ No gaps found", output)
        self.assertIn("Ledger Range: 1,000 to 1,005", output)
        self.assertIn("Total Ledgers Spanned: 6", output)
        self.assertIn("Unique Ledgers with Events: 6", output)

    def test_single_gap_detection(self):
        """Test detection of a single gap in ledger sequence."""
        # Create events with a gap: 1000, 1001, then skip to 1005, 1006
        for ledger in [1000, 1001, 1005, 1006]:
            ContractEventFactory(contract=self.contract, ledger=ledger)

        call_command("check_integrity", stdout=self.out)
        output = self.out.getvalue()

        self.assertIn("✗ Found 1 gap(s)", output)
        self.assertIn("Gap: Ledger 1,002 - 1,004", output)
        self.assertIn("Total Missing Ledgers: 3", output)
        self.assertIn("Coverage: 57.14%", output)

    def test_multiple_gaps_detection(self):
        """Test detection of multiple gaps in ledger sequence."""
        # Create events: 1000, 1001 | gap | 1005 | gap | 1010, 1011
        for ledger in [1000, 1001, 1005, 1010, 1011]:
            ContractEventFactory(contract=self.contract, ledger=ledger)

        call_command("check_integrity", stdout=self.out)
        output = self.out.getvalue()

        self.assertIn("✗ Found 2 gap(s)", output)
        self.assertIn("Gap: Ledger 1,002 - 1,004", output)
        self.assertIn("Gap: Ledger 1,006 - 1,009", output)
        self.assertIn("Total Missing Ledgers: 7", output)

    def test_gap_at_boundaries(self):
        """Test gaps at the beginning and end of range."""
        # Create events: skip 1000-1004, then 1005-1010, then skip to end
        for ledger in range(1005, 1011):
            ContractEventFactory(contract=self.contract, ledger=ledger)

        call_command("check_integrity", stdout=self.out)
        output = self.out.getvalue()

        # Note: gaps only between min and max ledgers in database
        # So no gap at the start since 1005 is the minimum
        self.assertIn("✓ No gaps found", output)

    def test_filter_by_contract(self):
        """Test filtering by specific contract."""
        contract2 = TrackedContractFactory()

        # Contract 1: continuous 1000-1002
        for i in range(3):
            ContractEventFactory(contract=self.contract, ledger=1000 + i)

        # Contract 2: continuous 2000-2002
        for i in range(3):
            ContractEventFactory(contract=contract2, ledger=2000 + i)

        # Check contract 1 only
        call_command("check_integrity", f"--contract={self.contract.id}", stdout=self.out)
        output = self.out.getvalue()

        self.assertIn("✓ No gaps found", output)
        self.assertIn("Ledger Range: 1,000 to 1,002", output)

    def test_filter_by_event_type(self):
        """Test filtering by event type."""
        # Create events with different types
        for i in range(3):
            ContractEventFactory(
                contract=self.contract, ledger=1000 + i, event_type="swap"
            )

        for i in range(3):
            ContractEventFactory(
                contract=self.contract,
                ledger=1010 + i,
                event_type="transfer",
            )

        # Check only 'swap' events (should be continuous)
        call_command("check_integrity", "--event-type=swap", stdout=self.out)
        output = self.out.getvalue()

        self.assertIn("✓ No gaps found", output)
        self.assertIn("Event Type Filter: swap", output)

    def test_verbose_output(self):
        """Test verbose mode output."""
        # Create events with gaps
        for ledger in [1000, 1001, 1005, 1006]:
            ContractEventFactory(contract=self.contract, ledger=ledger)

        call_command("check_integrity", "--verbose", stdout=self.out)
        output = self.out.getvalue()

        self.assertIn("✗ Found 1 gap(s)", output)
        self.assertIn("Gap: Ledger 1,002 - 1,004", output)

    def test_large_gap(self):
        """Test detection of very large gaps."""
        # Create events with a very large gap
        ContractEventFactory(contract=self.contract, ledger=1000)
        ContractEventFactory(contract=self.contract, ledger=100000)

        call_command("check_integrity", stdout=self.out)
        output = self.out.getvalue()

        self.assertIn("✗ Found 1 gap(s)", output)
        self.assertIn("Gap: Ledger 1,001 - 99,999", output)
        self.assertIn("Total Missing Ledgers: 98,999", output)

    def test_single_event(self):
        """Test with only one event."""
        ContractEventFactory(contract=self.contract, ledger=5000)

        call_command("check_integrity", stdout=self.out)
        output = self.out.getvalue()

        self.assertIn("✓ No gaps found", output)
        self.assertIn("Ledger Range: 5,000 to 5,000", output)
        self.assertIn("Total Ledgers Spanned: 1", output)

    def test_duplicate_ledgers(self):
        """Test handling of multiple events with same ledger sequence."""
        # Create multiple events at same ledger (different event_index)
        for idx in range(3):
            ContractEventFactory(
                contract=self.contract, ledger=1000, event_index=idx
            )

        # Add more unique ledgers
        for i in range(1, 3):
            ContractEventFactory(contract=self.contract, ledger=1000 + i)

        call_command("check_integrity", stdout=self.out)
        output = self.out.getvalue()

        self.assertIn("✓ No gaps found", output)
        # Should count unique ledgers
        self.assertIn("Unique Ledgers with Events: 3", output)
        # But more total events
        self.assertIn("Total Events: 5", output)


class TestCheckIntegrityGapFinding(TestCase):
    """Test the gap-finding algorithm directly."""

    def test_find_gaps_no_gaps(self):
        """Test _find_gaps with continuous sequence."""
        from soroscan.ingest.management.commands.check_integrity import Command

        ledgers = set(range(100, 106))
        gaps = Command._find_gaps(100, 105, ledgers)
        self.assertEqual(gaps, [])

    def test_find_gaps_single_gap(self):
        """Test _find_gaps with single gap."""
        from soroscan.ingest.management.commands.check_integrity import Command

        ledgers = {100, 101, 105, 106}
        gaps = Command._find_gaps(100, 106, ledgers)
        self.assertEqual(gaps, [(102, 104)])

    def test_find_gaps_multiple_gaps(self):
        """Test _find_gaps with multiple gaps."""
        from soroscan.ingest.management.commands.check_integrity import Command

        ledgers = {100, 101, 105, 110, 111}
        gaps = Command._find_gaps(100, 111, ledgers)
        self.assertEqual(gaps, [(102, 104), (106, 109)])

    def test_find_gaps_all_missing(self):
        """Test _find_gaps with all values missing."""
        from soroscan.ingest.management.commands.check_integrity import Command

        ledgers = set()
        gaps = Command._find_gaps(100, 105, ledgers)
        self.assertEqual(gaps, [(100, 105)])

    def test_find_gaps_single_value(self):
        """Test _find_gaps with single value."""
        from soroscan.ingest.management.commands.check_integrity import Command

        ledgers = {100}
        gaps = Command._find_gaps(100, 100, ledgers)
        self.assertEqual(gaps, [])

    def test_find_gaps_empty_ledgers(self):
        """Test _find_gaps with no ledgers in range."""
        from soroscan.ingest.management.commands.check_integrity import Command

        ledgers = {100, 101, 102}
        gaps = Command._find_gaps(100, 110, ledgers)
        self.assertEqual(gaps, [(103, 110)])


@pytest.mark.django_db
class TestCheckIntegrityCommandPytest:
    """Pytest-style tests for check_integrity command."""

    def test_realistic_ledger_gaps(self):
        """Test with realistic ledger data and gaps."""
        contract = TrackedContractFactory()

        # Simulate realistic event distribution with some gaps
        # Events at ledgers: 1000-1010, 1015-1020, 1050-1055
        ledgers_with_events = list(range(1000, 1011)) + list(
            range(1015, 1021)
        ) + list(range(1050, 1056))

        for ledger in ledgers_with_events:
            ContractEventFactory(contract=contract, ledger=ledger)

        out = StringIO()
        call_command("check_integrity", stdout=out)
        output = out.getvalue()

        # Should detect gaps
        assert "✗ Found" in output
        # Should show first gap: 1011-1014
        assert "Gap: Ledger 1,011 - 1,014" in output
        # Should show second gap: 1021-1049
        assert "Gap: Ledger 1,021 - 1,049" in output
        # Coverage should be calculated correctly
        assert "Coverage:" in output

    def test_command_with_mixed_contracts_and_types(self):
        """Test with multiple contracts and event types."""
        contract1 = TrackedContractFactory()
        contract2 = TrackedContractFactory()

        # Contract 1, type swap
        for i in range(5):
            ContractEventFactory(
                contract=contract1, ledger=1000 + i, event_type="swap"
            )

        # Contract 1, type transfer
        for i in range(5, 10):
            ContractEventFactory(
                contract=contract1, ledger=1000 + i, event_type="transfer"
            )

        # Contract 2 (different range)
        for i in range(5):
            ContractEventFactory(
                contract=contract2, ledger=2000 + i, event_type="swap"
            )

        # Check contract 1, swap type only
        out = StringIO()
        call_command(
            "check_integrity",
            f"--contract={contract1.id}",
            "--event-type=swap",
            stdout=out,
        )
        output = out.getvalue()

        # Should show continuous ledgers for contract1 swaps only
        assert "✓ No gaps found" in output
        assert f"Contract ID: {contract1.id}" in output
        assert "Event Type Filter: swap" in output
