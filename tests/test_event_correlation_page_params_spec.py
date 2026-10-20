import subprocess
from pathlib import Path


def test_event_correlation_page_uses_use_params():
    repo_root = Path(__file__).resolve().parent.parent
    page_file = repo_root / "soroscan-frontend" / "app" / "contracts" / "[id]" / "events" / "correlation" / "page.tsx"
    assert page_file.is_file(), f"File not found: {page_file}"

    content = page_file.read_text(encoding="utf-8")

    # Verify sync params prop destructuring is removed
    assert "const { id: contractId } = params" not in content, "Synchronous params destructuring still present"
    assert "params: { id: string }" not in content, "Synchronous params type annotation still present"

    # Verify useParams is imported and used
    assert "import { useParams } from 'next/navigation'" in content or 'import { useParams } from "next/navigation"' in content
    assert "useParams<" in content or "useParams()" in content
    assert "decodeURIComponent" in content


def test_event_correlation_page_jest_suite():
    repo_root = Path(__file__).resolve().parent.parent
    frontend_dir = repo_root / "soroscan-frontend"

    result = subprocess.run(
        ["npm", "test", "--", "__tests__/event-correlation-page.test.tsx"],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        shell=True,
    )

    combined_output = f"{result.stdout}\n{result.stderr}"
    assert result.returncode == 0, f"Jest test failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
    assert "2 passed" in combined_output
