"""
Specification assertions for TypeScript SDK ContractEventTypeInfo definition and export (Issue #1616).
Verifies:
1. `ContractEventTypeInfo` is defined in `sdk/typescript/src/types.ts`.
2. `ContractEventTypeInfo` is exported from `sdk/typescript/src/index.ts`.
3. Vitest runs `test/sc17-contract-event-type-info.test.ts` cleanly with 100% passing tests.
"""
import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SDK_DIR = REPO_ROOT / "sdk" / "typescript"
TYPES_FILE = SDK_DIR / "src" / "types.ts"
INDEX_FILE = SDK_DIR / "src" / "index.ts"
TEST_FILE = SDK_DIR / "test" / "sc17-contract-event-type-info.test.ts"


def test_contract_event_type_info_definition_and_export():
    assert TYPES_FILE.exists(), f"Missing {TYPES_FILE}"
    types_content = TYPES_FILE.read_text(encoding="utf-8")
    assert "export interface ContractEventTypeInfo" in types_content
    assert "eventType: string;" in types_content
    assert "count: number;" in types_content

    assert INDEX_FILE.exists(), f"Missing {INDEX_FILE}"
    index_content = INDEX_FILE.read_text(encoding="utf-8")
    assert "ContractEventTypeInfo" in index_content


def test_contract_event_type_info_vitest_execution():
    assert TEST_FILE.exists(), f"Missing {TEST_FILE}"
    cmd = ["npx.cmd" if os.name == "nt" else "npx", "vitest", "run", "test/sc17-contract-event-type-info.test.ts"]
    proc = subprocess.run(
        cmd,
        cwd=str(SDK_DIR),
        capture_output=True,
        text=True,
        shell=(os.name == "nt"),
    )
    assert proc.returncode == 0, f"vitest run failed:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
    assert "test/sc17-contract-event-type-info.test.ts" in proc.stdout
    assert "passed" in proc.stdout
