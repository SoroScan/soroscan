"""
Specification assertions for TypeScript SDK RecordTaggedEvent import/export (Issue #1615).
Verifies:
1. `RecordTaggedEventParams` and `RecordTaggedEventResponse` are imported in `client.ts`.
2. `RecordTaggedEventParams` and `RecordTaggedEventResponse` are exported from `index.ts`.
3. Vitest runs `test/sc24-tagged-event.test.ts` cleanly and all tests pass.
"""
import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SDK_DIR = REPO_ROOT / "sdk" / "typescript"
CLIENT_FILE = SDK_DIR / "src" / "client.ts"
INDEX_FILE = SDK_DIR / "src" / "index.ts"
TEST_FILE = SDK_DIR / "test" / "sc24-tagged-event.test.ts"


def test_tagged_event_imports_and_exports():
    assert CLIENT_FILE.exists(), f"Missing {CLIENT_FILE}"
    client_content = CLIENT_FILE.read_text(encoding="utf-8")
    assert "RecordTaggedEventParams" in client_content
    assert "RecordTaggedEventResponse" in client_content

    assert INDEX_FILE.exists(), f"Missing {INDEX_FILE}"
    index_content = INDEX_FILE.read_text(encoding="utf-8")
    assert "RecordTaggedEventParams" in index_content
    assert "RecordTaggedEventResponse" in index_content


def test_tagged_event_vitest_execution():
    assert TEST_FILE.exists(), f"Missing {TEST_FILE}"
    cmd = ["npx.cmd" if os.name == "nt" else "npx", "vitest", "run", "test/sc24-tagged-event.test.ts"]
    proc = subprocess.run(
        cmd,
        cwd=str(SDK_DIR),
        capture_output=True,
        text=True,
        shell=(os.name == "nt"),
    )
    assert proc.returncode == 0, f"vitest run failed:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
    assert "test/sc24-tagged-event.test.ts" in proc.stdout
    assert "passed" in proc.stdout
