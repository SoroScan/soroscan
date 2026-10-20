"""
Specification assertions for TypeScript SDK duplicate recordStructuredEvent fix (Issue #1614).
Verifies:
1. `recordStructuredEvent` is defined exactly once in `sdk/typescript/src/client.ts` (eliminating TS2393).
2. Vitest runs `test/sc38-structured-event.test.ts` cleanly with 0 duplicate member warnings and 100% passing.
"""
import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SDK_DIR = REPO_ROOT / "sdk" / "typescript"
CLIENT_FILE = SDK_DIR / "src" / "client.ts"
TEST_FILE = SDK_DIR / "test" / "sc38-structured-event.test.ts"


def test_record_structured_event_defined_once():
    assert CLIENT_FILE.exists(), f"Missing {CLIENT_FILE}"
    content = CLIENT_FILE.read_text(encoding="utf-8")

    occurrences = content.count("async recordStructuredEvent(")
    assert occurrences == 1, f"Expected exactly 1 definition of recordStructuredEvent, found {occurrences}"


def test_sc38_vitest_execution():
    assert TEST_FILE.exists(), f"Missing {TEST_FILE}"
    cmd = ["npx.cmd" if os.name == "nt" else "npx", "vitest", "run", "test/sc38-structured-event.test.ts"]
    proc = subprocess.run(
        cmd,
        cwd=str(SDK_DIR),
        capture_output=True,
        text=True,
        shell=(os.name == "nt"),
    )
    assert proc.returncode == 0, f"vitest run failed:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
    assert "Duplicate member" not in proc.stdout
    assert "Duplicate member" not in proc.stderr
    assert "passed" in proc.stdout
