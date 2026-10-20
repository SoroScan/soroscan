import os
import subprocess
from pathlib import Path


def test_use_webhook_uses_react_jsx_element():
    repo_root = Path(__file__).resolve().parent.parent
    hook_file = repo_root / "sdk" / "typescript" / "src" / "hooks" / "useWebhook.ts"
    assert hook_file.is_file(), f"File not found: {hook_file}"

    content = hook_file.read_text(encoding="utf-8")

    # Verify bare JSX.Element is eliminated
    assert "JSX.Element" in content
    assert ": JSX.Element" not in content, "Bare ': JSX.Element' still present in useWebhook.ts"

    # Verify React.JSX.Element is used
    assert ": React.JSX.Element" in content, "Expected ': React.JSX.Element' return type annotation"

    # Verify React import is present
    assert "import React" in content, "Expected 'import React' in useWebhook.ts"


def test_vitest_hooks_suite():
    repo_root = Path(__file__).resolve().parent.parent
    sdk_dir = repo_root / "sdk" / "typescript"

    result = subprocess.run(
        ["npm", "test", "test/hooks.test.tsx"],
        cwd=sdk_dir,
        capture_output=True,
        text=True,
        shell=True,
    )

    assert result.returncode == 0, f"Vitest hooks test failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
    assert "4 passed" in result.stdout
