import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIR = REPO_ROOT / "soroscan-frontend"
PAGE_FILE = FRONTEND_DIR / "app" / "live" / "page.tsx"
TEST_FILE = FRONTEND_DIR / "__tests__" / "live-stream-states.test.tsx"


def test_live_page_uses_empty_state_and_connecting_state():
    assert PAGE_FILE.is_file(), f"Target page missing: {PAGE_FILE}"
    content = PAGE_FILE.read_text(encoding="utf-8")
    assert "EmptyState" in content, "Live page must import and use EmptyState"
    assert "live-stream-connecting" in content, "Connecting container testid must exist"
    assert "live-stream-empty" in content, "Empty state container testid must exist"
    assert "live-stream-error" in content, "Error state container testid must exist"
    assert "CONNECTING_TO_STREAM" in content, "Connecting title must be present"
    assert "NO_EVENTS_YET" in content, "Connected-with-no-events title must be present"
    assert "RECONNECT" in content, "Reconnect action label must be present"


def test_live_page_connection_status_types():
    content = PAGE_FILE.read_text(encoding="utf-8")
    assert "StreamConnectionStatus" in content, "StreamConnectionStatus type must be exported"
    for status in ["connecting", "connected", "disconnected", "error"]:
        assert f'"{status}"' in content, f"Status {status} must be supported"


def test_unit_test_suite_covers_issue_1711_acceptance_criteria():
    assert TEST_FILE.is_file(), "live-stream-states.test.tsx must exist"
    content = TEST_FILE.read_text(encoding="utf-8")
    # Acceptance criteria:
    # 1. Connecting state is visible
    assert "live-stream-connecting" in content
    assert "CONNECTING_TO_STREAM" in content
    # 2. Connected-with-no-events state is visible
    assert "live-stream-empty" in content
    assert "NO_EVENTS_YET" in content
    # 3. Error/disconnected state handled
    assert "live-stream-error" in content
    assert "STREAM_DISCONNECTED" in content
    assert "RECONNECT" in content


def test_no_forbidden_secrets_in_new_test_files():
    forbidden_patterns = [
        re.compile(r"sk_live_[0-9a-zA-Z]{16,}"),
        re.compile(r"ghp_[0-9a-zA-Z]{20,}"),
        re.compile(r"xox[baprs]-[0-9a-zA-Z]{10,}"),
    ]
    content = TEST_FILE.read_text(encoding="utf-8")
    for pattern in forbidden_patterns:
        assert not pattern.search(content), f"Forbidden secret detected in {TEST_FILE.name}"
