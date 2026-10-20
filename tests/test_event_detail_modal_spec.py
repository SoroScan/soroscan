"""
Specification test guarding EventDetailModal test suite (Issue #1712).
Verifies that soroscan-frontend/app/dashboard/components/__tests__/EventDetailModal.test.tsx
satisfies all acceptance criteria:
1. Renders key fields (metadata, contract ID, event ID, txHash, optional attributes).
2. Covers close behaviour (header icon, footer button, overlay click).
3. Covers copy interactions (Event ID, Contract ID, txHash, payload, clipboard errors).
4. Covers payload view switching (JSON <-> HEX).
"""

from pathlib import Path
import re
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
TEST_FILE = (
    REPO_ROOT
    / "soroscan-frontend"
    / "app"
    / "dashboard"
    / "components"
    / "__tests__"
    / "EventDetailModal.test.tsx"
)
COMPONENT_FILE = (
    REPO_ROOT
    / "soroscan-frontend"
    / "app"
    / "dashboard"
    / "components"
    / "EventDetailModal.tsx"
)


def test_event_detail_modal_files_exist():
    assert COMPONENT_FILE.is_file(), f"Component missing: {COMPONENT_FILE}"
    assert TEST_FILE.is_file(), f"Test file missing: {TEST_FILE}"


def test_test_file_covers_rendering_criteria():
    content = TEST_FILE.read_text(encoding="utf-8")

    assert "describe('Rendering'" in content
    # Asserts metadata
    assert "Timestamp" in content
    assert "Ledger" in content
    assert "Event Index" in content
    assert "Event Type" in content
    # Asserts detail fields
    assert "Event ID" in content
    assert "Contract ID" in content
    assert "Transaction Hash" in content
    assert "Contract Name" in content
    assert "Payload Hash" in content
    assert "Schema Version" in content
    assert "Validation Status" in content
    # Minimal event handling
    assert "omits optional fields gracefully" in content


def test_test_file_covers_close_behaviour():
    content = TEST_FILE.read_text(encoding="utf-8")

    assert "describe('Close Behaviour'" in content
    assert "Close event details" in content
    assert "calls onClose when bottom Close button is clicked" in content
    assert "calls onClose when clicking overlay backdrop directly" in content
    assert "does not call onClose when clicking inside the modal dialog" in content


def test_test_file_covers_copy_interactions():
    content = TEST_FILE.read_text(encoding="utf-8")

    assert "describe('Copy Interactions'" in content
    assert "copies Event ID to clipboard" in content
    assert "copies Contract ID to clipboard" in content
    assert "copies Transaction Hash to clipboard" in content
    assert "copies Payload Hash to clipboard when available" in content
    assert "copies JSON payload to clipboard and shows temporary feedback" in content
    assert "handles clipboard writeText rejection gracefully without crashing" in content


def test_test_file_covers_payload_views():
    content = TEST_FILE.read_text(encoding="utf-8")

    assert "describe('Payload Views (JSON and HEX)'" in content
    assert "View payload as JSON" in content
    assert "View payload as HEX" in content
    assert "Copy event payload to clipboard" in content
