import subprocess
from pathlib import Path


def test_query_builder_accessible_feedback_spec():
    repo_root = Path(__file__).resolve().parent.parent
    page_file = repo_root / "soroscan-frontend" / "app" / "reports" / "query-builder" / "page.tsx"
    assert page_file.is_file(), f"File not found: {page_file}"

    content = page_file.read_text(encoding="utf-8")

    # Verify window.alert is completely removed
    assert "alert(" not in content, "Found window.alert in query builder page"

    # Verify accessible live region and role are used
    assert 'aria-live="polite"' in content
    assert 'aria-atomic="true"' in content
    assert 'role={feedback.type === "error" ? "alert" : "status"}' in content
    assert 'data-testid="query-builder-feedback"' in content
    assert 'aria-label="Dismiss feedback"' in content


def test_query_builder_accessible_feedback_jest_suite():
    repo_root = Path(__file__).resolve().parent.parent
    frontend_dir = repo_root / "soroscan-frontend"

    result = subprocess.run(
        ["npm", "test", "--", "__tests__/query-builder-accessible-feedback.test.tsx"],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        shell=True,
    )

    combined_output = f"{result.stdout}\n{result.stderr}"
    assert result.returncode == 0, f"Jest test failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
    assert "3 passed" in combined_output
