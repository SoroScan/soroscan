import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIR = REPO_ROOT / "soroscan-frontend"

LOADING_FILES = {
    "admin": FRONTEND_DIR / "app" / "admin" / "loading.tsx",
    "live": FRONTEND_DIR / "app" / "live" / "loading.tsx",
    "reports": FRONTEND_DIR / "app" / "reports" / "loading.tsx",
    "alerts": FRONTEND_DIR / "app" / "alerts" / "loading.tsx",
}

TEST_FILE = FRONTEND_DIR / "__tests__" / "route-loading-states.test.tsx"


def test_each_listed_route_has_loading_tsx():
    # Acceptance criterion: Each listed route has a loading.tsx.
    for route_name, file_path in LOADING_FILES.items():
        assert file_path.is_file(), f"Missing route-level loading file for {route_name}: {file_path}"
        content = file_path.read_text(encoding="utf-8")
        assert "export default function" in content, f"{route_name}/loading.tsx must export default component"
        assert 'role="status"' in content, f"{route_name}/loading.tsx must have role='status'"
        assert 'aria-busy="true"' in content, f"{route_name}/loading.tsx must declare aria-busy='true'"
        assert "sr-only" in content, f"{route_name}/loading.tsx must include sr-only accessibility text"


def test_loading_skeletons_match_layout_and_prevent_shift():
    # Acceptance criteria: Skeletons match page layout, no layout shift on load.
    for route_name, file_path in LOADING_FILES.items():
        content = file_path.read_text(encoding="utf-8")
        assert "bg-terminal-black" in content, f"{route_name}/loading.tsx must match bg-terminal-black background"
        assert "font-terminal-mono" in content, f"{route_name}/loading.tsx must match font-terminal-mono"
        assert "Skeleton" in content, f"{route_name}/loading.tsx must import and use Skeleton primitives"

    # Specific structural checks
    admin_content = LOADING_FILES["admin"].read_text(encoding="utf-8")
    assert "AdminDashboardLayout" in admin_content, "admin loading should align with AdminDashboardLayout"

    reports_content = LOADING_FILES["reports"].read_text(encoding="utf-8")
    assert "SkeletonTable" in reports_content, "reports loading should render SkeletonTable for query-builder"

    alerts_content = LOADING_FILES["alerts"].read_text(encoding="utf-8")
    assert "SkeletonTable" in alerts_content, "alerts loading should render SkeletonTable for active rules"


def test_unit_test_suite_covers_issue_1708_acceptance_criteria():
    assert TEST_FILE.is_file(), "route-loading-states.test.tsx must exist"
    content = TEST_FILE.read_text(encoding="utf-8")
    assert "AdminLoading" in content
    assert "LiveStreamLoading" in content
    assert "ReportsLoading" in content
    assert "AlertsLoading" in content
    assert "aria-busy" in content


def test_no_forbidden_secrets_in_new_test_files():
    forbidden_patterns = [
        re.compile(r"sk_live_[0-9a-zA-Z]{16,}"),
        re.compile(r"ghp_[0-9a-zA-Z]{20,}"),
        re.compile(r"xox[baprs]-[0-9a-zA-Z]{10,}"),
    ]
    content = TEST_FILE.read_text(encoding="utf-8")
    for pattern in forbidden_patterns:
        assert not pattern.search(content), f"Forbidden secret detected in {TEST_FILE.name}"
