import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIR = REPO_ROOT / "soroscan-frontend"
PAGE_FILE = FRONTEND_DIR / "app" / "reports" / "query-builder" / "page.tsx"
TEST_FILE = FRONTEND_DIR / "__tests__" / "query-builder-empty-state.test.tsx"


def test_query_builder_page_uses_empty_state():
    assert PAGE_FILE.is_file(), f"Target page missing: {PAGE_FILE}"
    content = PAGE_FILE.read_text(encoding="utf-8")
    assert "EmptyState" in content, "QueryBuilder page must import and use EmptyState"
    assert "query-builder-empty" in content, "EmptyState must render data-testid='query-builder-empty'"
    assert "NO_QUERY_RESULTS" in content, "EmptyState title should be NO_QUERY_RESULTS"
    assert "RESET_FILTERS" in content, "EmptyState action should provide RESET_FILTERS button"


def test_export_buttons_disabled_when_empty():
    content = PAGE_FILE.read_text(encoding="utf-8")
    assert "rows.length === 0" in content, "Export buttons should be disabled when rows is empty"
    assert "Export CSV" in content
    assert "Export JSON" in content
    assert "Export Parquet" in content


def test_unit_test_suite_covers_issue_1709_acceptance_criteria():
    assert TEST_FILE.is_file(), "query-builder-empty-state.test.tsx must exist"
    content = TEST_FILE.read_text(encoding="utf-8")
    assert "query-builder-empty" in content
    assert "NO_QUERY_RESULTS" in content
    assert "RESET_FILTERS" in content
    assert "toBeDisabled" in content


def test_no_forbidden_secrets_in_new_test_files():
    forbidden_patterns = [
        re.compile(r"sk_live_[0-9a-zA-Z]{16,}"),
        re.compile(r"ghp_[0-9a-zA-Z]{20,}"),
        re.compile(r"xox[baprs]-[0-9a-zA-Z]{10,}"),
    ]
    content = TEST_FILE.read_text(encoding="utf-8")
    for pattern in forbidden_patterns:
        assert not pattern.search(content), f"Forbidden secret detected in {TEST_FILE.name}"
