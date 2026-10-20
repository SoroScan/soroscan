import subprocess
from pathlib import Path


def test_create_webhook_modal_associates_timeout_error():
    repo_root = Path(__file__).resolve().parent.parent
    modal_file = repo_root / "soroscan-frontend" / "app" / "webhooks" / "components" / "CreateWebhookModal.tsx"
    assert modal_file.is_file(), f"File not found: {modal_file}"

    content = modal_file.read_text(encoding="utf-8")

    # Verify aria-describedby is linked to timeout-input-error
    assert 'aria-describedby={timeoutError ? "timeout-input-error" : undefined}' in content
    assert 'id="timeout-input-error"' in content
    assert 'aria-invalid={!!timeoutError}' in content


def test_create_webhook_modal_a11y_jest_suite():
    repo_root = Path(__file__).resolve().parent.parent
    frontend_dir = repo_root / "soroscan-frontend"

    result = subprocess.run(
        ["npm", "test", "--", "__tests__/create-webhook-modal-a11y.test.tsx"],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        shell=True,
    )

    combined_output = f"{result.stdout}\n{result.stderr}"
    assert result.returncode == 0, f"Jest test failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
    assert "2 passed" in combined_output
