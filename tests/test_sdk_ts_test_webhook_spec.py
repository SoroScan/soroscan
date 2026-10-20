"""
Specification assertions for TypeScript SDK testWebhook method (Issue #1671).
Verifies:
1. `TestWebhookResponse` is typed in `types.ts` and exported from `index.ts`.
2. `SoroScanClient.testWebhook(webhookId)` is implemented in `client.ts`.
3. Vitest unit tests in `sdk/typescript/test/testWebhook.test.ts` execute cleanly and pass.
"""
import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SDK_DIR = REPO_ROOT / "sdk" / "typescript"
TYPES_FILE = SDK_DIR / "src" / "types.ts"
CLIENT_FILE = SDK_DIR / "src" / "client.ts"
INDEX_FILE = SDK_DIR / "src" / "index.ts"
TEST_FILE = SDK_DIR / "test" / "testWebhook.test.ts"


def test_test_webhook_types_and_exports():
    assert TYPES_FILE.exists(), f"Missing {TYPES_FILE}"
    types_content = TYPES_FILE.read_text(encoding="utf-8")
    assert "export interface TestWebhookResponse" in types_content
    assert "status: string;" in types_content

    assert INDEX_FILE.exists(), f"Missing {INDEX_FILE}"
    index_content = INDEX_FILE.read_text(encoding="utf-8")
    assert "TestWebhookResponse" in index_content


def test_test_webhook_client_implementation():
    assert CLIENT_FILE.exists(), f"Missing {CLIENT_FILE}"
    client_content = CLIENT_FILE.read_text(encoding="utf-8")
    assert "async testWebhook(" in client_content
    assert "`/v1/webhooks/${encodeURIComponent(String(webhookId))}/test`" in client_content
    assert "TestWebhookResponse" in client_content


def test_test_webhook_vitest_execution():
    assert TEST_FILE.exists(), f"Missing {TEST_FILE}"
    cmd = ["npx.cmd" if os.name == "nt" else "npx", "vitest", "run", "test/testWebhook.test.ts"]
    proc = subprocess.run(
        cmd,
        cwd=str(SDK_DIR),
        capture_output=True,
        text=True,
        shell=(os.name == "nt"),
    )
    assert proc.returncode == 0, f"vitest run failed:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
    assert "test/testWebhook.test.ts" in proc.stdout
    assert "passed" in proc.stdout
