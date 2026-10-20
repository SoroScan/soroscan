import subprocess
from pathlib import Path


def test_webhook_page_removes_duplicate_inforow_timeout():
    repo_root = Path(__file__).resolve().parent.parent
    page_file = repo_root / "soroscan-frontend" / "app" / "webhooks" / "[id]" / "page.tsx"
    assert page_file.is_file(), f"File not found: {page_file}"

    content = page_file.read_text(encoding="utf-8")

    # Verify duplicate InfoRow is removed
    assert '<InfoRow label="REQUEST_TIMEOUT"' not in content, "Redundant <InfoRow label=\"REQUEST_TIMEOUT\" ... /> still present"

    # Verify the canonical configuration block remains
    assert 'REQUEST_TIMEOUT' in content
    assert 'id="timeout-input"' in content


def test_webhook_timeout_dedup_jest_suite():
    repo_root = Path(__file__).resolve().parent.parent
    frontend_dir = repo_root / "soroscan-frontend"

    result = subprocess.run(
        ["npm", "test", "--", "__tests__/webhook-request-timeout-dedup.test.tsx"],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        shell=True,
    )

    combined_output = f"{result.stdout}\n{result.stderr}"
    assert result.returncode == 0, f"Jest test failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
    assert "1 passed" in combined_output
