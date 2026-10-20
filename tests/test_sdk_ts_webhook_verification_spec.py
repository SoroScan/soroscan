"""
Reliability and specification assertions for SDK-TS Webhook Signature Verification tests (Issue #1673).
Ensures:
1. `sdk/typescript/test/webhookVerification.test.ts` exists and covers:
   - Valid signature verification with string & Buffer payloads.
   - Tampered payload & signature rejection.
   - Header format and prefix validation (ed25519= prefix).
   - Public key validation and error handling robustness.
   - Re-export parity from SDK main entrypoint.
2. The TypeScript SDK test runner (vitest) executes the test file and exits cleanly with all tests passing.
"""
import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEST_FILE = REPO_ROOT / "sdk" / "typescript" / "test" / "webhookVerification.test.ts"
SDK_DIR = REPO_ROOT / "sdk" / "typescript"


def test_webhook_verification_test_file_structure():
    assert TEST_FILE.exists(), f"Expected test file at {TEST_FILE}"
    content = TEST_FILE.read_text(encoding="utf-8")

    # Key test group assertions
    assert "describe(\"verifyWebhookSignature\"" in content
    assert "verifies a valid signature with a string payload" in content
    assert "verifies a valid signature with a Buffer payload" in content
    assert "rejects when the payload body is tampered" in content
    assert "rejects when the signature bytes are corrupted" in content
    assert "rejects signature header missing ed25519= prefix" in content
    assert "rejects signature header with wrong prefix" in content
    assert "rejects public key with incorrect byte length" in content
    assert "verifyWebhookSignatureFromIndex" in content


def test_webhook_verification_vitest_execution():
    cmd = ["npx.cmd" if os.name == "nt" else "npx", "vitest", "run", "test/webhookVerification.test.ts"]
    proc = subprocess.run(
        cmd,
        cwd=str(SDK_DIR),
        capture_output=True,
        text=True,
        shell=(os.name == "nt"),
    )
    assert proc.returncode == 0, f"vitest failed:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
    assert "test/webhookVerification.test.ts" in proc.stdout
    assert "passed" in proc.stdout
