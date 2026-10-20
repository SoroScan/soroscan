"""
Specification assertions for TypeScript SDK feature re-exports .js extensions (Issue #1617).
Verifies:
1. `sdk/typescript/src/index.ts` uses `.js` extensions on all feature re-exports (preventing TS2835).
2. Vitest runs `test/features-reexports.test.ts` cleanly with 100% passing tests.
"""
import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SDK_DIR = REPO_ROOT / "sdk" / "typescript"
INDEX_FILE = SDK_DIR / "src" / "index.ts"
TEST_FILE = SDK_DIR / "test" / "features-reexports.test.ts"


def test_feature_reexports_have_js_extensions():
    assert INDEX_FILE.exists(), f"Missing {INDEX_FILE}"
    content = INDEX_FILE.read_text(encoding="utf-8")

    assert 'export * from "./features/sc36.js";' in content
    assert 'export * from "./features/sc31.js";' in content
    assert 'export * from "./features/sc21.js";' in content
    assert 'export * from "./features/sc20.js";' in content

    # Assert no missing .js extensions remain for features
    assert 'export * from "./features/sc36";' not in content
    assert 'export * from "./features/sc31";' not in content
    assert 'export * from "./features/sc21";' not in content
    assert 'export * from "./features/sc20";' not in content


def test_features_vitest_execution():
    assert TEST_FILE.exists(), f"Missing {TEST_FILE}"
    cmd = ["npx.cmd" if os.name == "nt" else "npx", "vitest", "run", "test/features-reexports.test.ts"]
    proc = subprocess.run(
        cmd,
        cwd=str(SDK_DIR),
        capture_output=True,
        text=True,
        shell=(os.name == "nt"),
    )
    assert proc.returncode == 0, f"vitest run failed:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
    assert "test/features-reexports.test.ts" in proc.stdout
    assert "passed" in proc.stdout
