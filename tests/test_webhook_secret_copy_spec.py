from pathlib import Path
import re


def test_webhook_secret_copy_button_implementation():
    repo_root = Path(__file__).resolve().parent.parent
    page_path = repo_root / "soroscan-frontend" / "app" / "webhooks" / "[id]" / "page.tsx"

    assert page_path.exists(), f"Webhook detail page must exist at {page_path}"

    content = page_path.read_text(encoding="utf-8")

    # 1. Must import Copy and Check icons from lucide-react
    assert "Copy" in content and "Check" in content, (
        "Page must import Copy and Check icons from lucide-react"
    )

    # 2. Must import and trigger showToast for user feedback
    assert "showToast" in content, (
        "Page must import and invoke showToast for copy feedback"
    )

    # 3. Must implement handleCopySecret function with clipboard logic
    assert "handleCopySecret" in content, (
        "Page must implement handleCopySecret callback"
    )
    assert "clipboard.writeText" in content, (
        "Page must write to navigator.clipboard"
    )

    # 4. Must render copy button with test id and aria label
    assert 'data-testid="copy-secret-button"' in content, (
        "Page must render copy button with data-testid='copy-secret-button'"
    )
    assert 'aria-label={copiedSecret ? "Copied secret" : "Copy secret"}' in content, (
        "Copy button must include accessible aria-label"
    )


def test_webhook_secret_copy_test_file_exists():
    repo_root = Path(__file__).resolve().parent.parent
    test_path = (
        repo_root
        / "soroscan-frontend"
        / "__tests__"
        / "webhook-secret-copy.test.tsx"
    )

    assert test_path.exists(), f"Unit test suite must exist at {test_path}"
    content = test_path.read_text(encoding="utf-8")
    assert "copy-secret-button" in content
    assert "whsec_super_secret_token_12345" in content
