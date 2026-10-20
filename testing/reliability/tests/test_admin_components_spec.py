import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
ADMIN_COMPONENTS_DIR = REPO_ROOT / "soroscan-frontend" / "app" / "admin" / "components"
ADMIN_TESTS_DIR = ADMIN_COMPONENTS_DIR / "__tests__"
ROOT_TESTS_DIR = REPO_ROOT / "soroscan-frontend" / "__tests__"


def test_admin_component_files_exist():
    expected_components = [
        "MetricsCard.tsx",
        "EventChart.tsx",
        "WebhookStats.tsx",
        "ErrorLog.tsx",
    ]
    for comp in expected_components:
        comp_file = ADMIN_COMPONENTS_DIR / comp
        assert comp_file.is_file(), f"Missing expected admin component: {comp}"
        content = comp_file.read_text(encoding="utf-8")
        assert "export function" in content or "export const" in content, f"Component {comp} must export a function/const"


def test_admin_unit_tests_exist_and_cover_all_components():
    expected_tests = [
        "MetricsCard.test.tsx",
        "EventChart.test.tsx",
        "WebhookStats.test.tsx",
        "ErrorLog.test.tsx",
        "index.test.ts",
    ]
    for test_name in expected_tests:
        test_file = ADMIN_TESTS_DIR / test_name
        assert test_file.is_file(), f"Missing unit test file: {test_name}"
        content = test_file.read_text(encoding="utf-8")
        assert "describe(" in content and "it(" in content, f"Test {test_name} must contain describe and it blocks"

    root_test = ROOT_TESTS_DIR / "admin-components.test.tsx"
    assert root_test.is_file(), "Missing root entry test: admin-components.test.tsx"


def test_empty_data_cases_are_explicitly_tested():
    # Acceptance criteria: Empty-data cases covered
    chart_test = (ADMIN_TESTS_DIR / "EventChart.test.tsx").read_text(encoding="utf-8")
    assert "data={[]}" in chart_test or "data: []" in chart_test, "EventChart test must cover empty data array"

    error_log_test = (ADMIN_TESTS_DIR / "ErrorLog.test.tsx").read_text(encoding="utf-8")
    assert "errors={[]}" in error_log_test or "errors: []" in error_log_test, "ErrorLog test must cover empty errors array"

    webhook_test = (ADMIN_TESTS_DIR / "WebhookStats.test.tsx").read_text(encoding="utf-8")
    assert "successRate={0}" in webhook_test, "WebhookStats test must cover 0% success rate boundary"


def test_no_forbidden_secrets_in_admin_tests():
    forbidden_patterns = [
        re.compile(r"sk_live_[0-9a-zA-Z]{16,}"),
        re.compile(r"ghp_[0-9a-zA-Z]{20,}"),
        re.compile(r"xox[baprs]-[0-9a-zA-Z]{10,}"),
    ]
    all_admin_test_files = list(ADMIN_TESTS_DIR.glob("*.*")) + [ROOT_TESTS_DIR / "admin-components.test.tsx"]
    for path in all_admin_test_files:
        content = path.read_text(encoding="utf-8")
        for pattern in forbidden_patterns:
            assert not pattern.search(content), f"Forbidden secret detected in {path.name}"
