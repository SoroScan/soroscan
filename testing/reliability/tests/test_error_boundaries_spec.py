import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIR = REPO_ROOT / "soroscan-frontend"

NOT_FOUND_FILE = FRONTEND_DIR / "app" / "not-found.tsx"
ERROR_FILE = FRONTEND_DIR / "app" / "error.tsx"
GLOBAL_ERROR_FILE = FRONTEND_DIR / "app" / "global-error.tsx"
TEST_FILE = FRONTEND_DIR / "__tests__" / "error-and-not-found-boundaries.test.tsx"


def test_custom_not_found_page_renders_with_terminal_ui():
    # Acceptance criterion: Custom 404 page renders.
    assert NOT_FOUND_FILE.is_file(), f"Missing not-found.tsx: {NOT_FOUND_FILE}"
    content = NOT_FOUND_FILE.read_text(encoding="utf-8")
    assert "not-found-page" in content, "not-found.tsx must declare data-testid='not-found-page'"
    assert "Ledger Entry Not Found" in content
    assert "RESOURCE_NOT_FOUND" in content
    assert "RETURN_TO_HOME" in content
    assert "EXPLORE_EVENTS" in content
    assert "bg-terminal-black" in content


def test_route_level_error_boundary_renders_with_retry():
    # Acceptance criterion: Route-level error boundary renders with a retry.
    assert ERROR_FILE.is_file(), f"Missing error.tsx: {ERROR_FILE}"
    content = ERROR_FILE.read_text(encoding="utf-8")
    assert '"use client"' in content or "'use client'" in content, "error.tsx must be a client component"
    assert "route-error-page" in content, "error.tsx must declare data-testid='route-error-page'"
    assert 'role="alert"' in content, "error.tsx must have accessible role='alert'"
    assert "System Operation Failed" in content
    assert "RETRY_OPERATION" in content, "error.tsx must include retry button"
    assert "reset()" in content or "reset" in content, "error.tsx must trigger reset callback"


def test_global_error_boundary_renders_with_html_envelope():
    # Acceptance criterion: Global error boundary renders.
    assert GLOBAL_ERROR_FILE.is_file(), f"Missing global-error.tsx: {GLOBAL_ERROR_FILE}"
    content = GLOBAL_ERROR_FILE.read_text(encoding="utf-8")
    assert '"use client"' in content or "'use client'" in content, "global-error.tsx must be a client component"
    assert "<html" in content, "global-error.tsx must define <html> tag envelope"
    assert "<body" in content, "global-error.tsx must define <body> tag envelope"
    assert "global-error-page" in content, "global-error.tsx must declare data-testid='global-error-page'"
    assert "Root Pipeline Halted" in content
    assert "REBOOT_APPLICATION" in content


def test_unit_test_suite_covers_issue_1707_acceptance_criteria():
    assert TEST_FILE.is_file(), "error-and-not-found-boundaries.test.tsx must exist"
    content = TEST_FILE.read_text(encoding="utf-8")
    assert "NotFound" in content
    assert "ErrorBoundary" in content
    assert "GlobalError" in content
    assert "error-reset-button" in content
    assert "global-error-reset-button" in content


def test_no_forbidden_secrets_in_new_test_files():
    forbidden_patterns = [
        re.compile(r"sk_live_[0-9a-zA-Z]{16,}"),
        re.compile(r"ghp_[0-9a-zA-Z]{20,}"),
        re.compile(r"xox[baprs]-[0-9a-zA-Z]{10,}"),
    ]
    content = TEST_FILE.read_text(encoding="utf-8")
    for pattern in forbidden_patterns:
        assert not pattern.search(content), f"Forbidden secret detected in {TEST_FILE.name}"
