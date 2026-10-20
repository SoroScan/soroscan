import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
STAT_CARD_FILE = REPO_ROOT / "soroscan-frontend" / "components" / "ui" / "stat-card.tsx"
UI_TEST_FILE = REPO_ROOT / "soroscan-frontend" / "components" / "ui" / "stat-card.test.tsx"
ROOT_TEST_FILE = REPO_ROOT / "soroscan-frontend" / "__tests__" / "stat-card.test.tsx"


def test_stat_card_component_structure():
    assert STAT_CARD_FILE.is_file(), "stat-card.tsx must exist"
    content = STAT_CARD_FILE.read_text(encoding="utf-8")
    assert "export function StatCard" in content, "StatCard component must be exported"
    assert "export interface StatCardProps" in content, "StatCardProps must be exported"


def test_stat_card_unit_tests_exist():
    assert UI_TEST_FILE.is_file(), "components/ui/stat-card.test.tsx must exist"
    assert ROOT_TEST_FILE.is_file(), "__tests__/stat-card.test.tsx must exist"

    ui_content = UI_TEST_FILE.read_text(encoding="utf-8")
    assert "describe(\"StatCard Component\"" in ui_content
    # Acceptance criteria: asserts content and variants
    assert "TrendingUp" in ui_content or "trendValue" in ui_content, "Must test trend variants"
    assert "isLoading" in ui_content, "Must test loading state"
    assert "DollarSign" in ui_content or "icon" in ui_content, "Must test icon slot"


def test_no_forbidden_secrets_in_stat_card_tests():
    forbidden_patterns = [
        re.compile(r"sk_live_[0-9a-zA-Z]{16,}"),
        re.compile(r"ghp_[0-9a-zA-Z]{20,}"),
        re.compile(r"xox[baprs]-[0-9a-zA-Z]{10,}"),
    ]
    for path in [UI_TEST_FILE, ROOT_TEST_FILE]:
        content = path.read_text(encoding="utf-8")
        for pattern in forbidden_patterns:
            assert not pattern.search(content), f"Forbidden secret detected in {path.name}"
