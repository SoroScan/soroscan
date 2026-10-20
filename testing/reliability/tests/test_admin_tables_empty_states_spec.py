import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIR = REPO_ROOT / "soroscan-frontend"
TEST_FILE = FRONTEND_DIR / "__tests__" / "admin-tables-empty-states.test.tsx"


def test_empty_state_component_used_in_all_target_files():
    target_files = [
        FRONTEND_DIR / "app" / "admin" / "data-quality" / "page.tsx",
        FRONTEND_DIR / "app" / "admin" / "dedup" / "page.tsx",
        FRONTEND_DIR / "app" / "admin" / "contracts-import" / "page.tsx",
        FRONTEND_DIR / "components" / "data-quality" / "DataQualityScorecard.tsx",
        FRONTEND_DIR / "components" / "data-quality" / "ReconciliationHistory.tsx",
        FRONTEND_DIR / "components" / "cdc-monitoring" / "CDCSyncDashboard.tsx",
        FRONTEND_DIR / "components" / "cdc-monitoring" / "TableLevelMetrics.tsx",
        FRONTEND_DIR / "components" / "cdc-monitoring" / "SyncLogViewer.tsx",
    ]

    for file_path in target_files:
        assert file_path.is_file(), f"Target file missing: {file_path}"
        content = file_path.read_text(encoding="utf-8")
        assert "EmptyState" in content, f"{file_path.name} must import and use EmptyState"


def test_context_specific_copy_per_table():
    # Acceptance criteria: Copy is specific to the table.
    dq_scorecard = (FRONTEND_DIR / "components" / "data-quality" / "DataQualityScorecard.tsx").read_text(encoding="utf-8")
    assert "NO_QUALITY_METRICS" in dq_scorecard or "contract quality data" in dq_scorecard

    reconcile_hist = (FRONTEND_DIR / "components" / "data-quality" / "ReconciliationHistory.tsx").read_text(encoding="utf-8")
    assert "NO_RECONCILIATION_JOBS" in reconcile_hist or "reconciliation jobs found" in reconcile_hist

    cdc_sync = (FRONTEND_DIR / "components" / "cdc-monitoring" / "CDCSyncDashboard.tsx").read_text(encoding="utf-8")
    assert "NO_CDC_SYNCS" in cdc_sync or "CDC syncs configured" in cdc_sync

    table_metrics = (FRONTEND_DIR / "components" / "cdc-monitoring" / "TableLevelMetrics.tsx").read_text(encoding="utf-8")
    assert "NO_TABLE_METRICS" in table_metrics or "table metrics available" in table_metrics

    dedup = (FRONTEND_DIR / "app" / "admin" / "dedup" / "page.tsx").read_text(encoding="utf-8")
    assert "NO_TEST_RESULTS" in dedup or "fingerprint test" in dedup

    import_page = (FRONTEND_DIR / "app" / "admin" / "contracts-import" / "page.tsx").read_text(encoding="utf-8")
    assert "NO_IMPORT_RECORDS" in import_page or "metadata import report" in import_page


def test_unit_test_suite_covers_all_tables():
    assert TEST_FILE.is_file(), "admin-tables-empty-states.test.tsx must exist"
    content = TEST_FILE.read_text(encoding="utf-8")
    assert "scorecard-empty" in content
    assert "reconciliation-history-empty" in content
    assert "dashboard-empty" in content
    assert "table-metrics-empty" in content
    assert "log-empty" in content
    assert "dedup-test-empty" in content
    assert "import-report-empty" in content


def test_no_forbidden_secrets_in_new_test_files():
    forbidden_patterns = [
        re.compile(r"sk_live_[0-9a-zA-Z]{16,}"),
        re.compile(r"ghp_[0-9a-zA-Z]{20,}"),
        re.compile(r"xox[baprs]-[0-9a-zA-Z]{10,}"),
    ]
    content = TEST_FILE.read_text(encoding="utf-8")
    for pattern in forbidden_patterns:
        assert not pattern.search(content), f"Forbidden secret detected in {TEST_FILE.name}"
