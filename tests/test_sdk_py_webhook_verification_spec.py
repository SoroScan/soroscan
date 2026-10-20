"""
Reliability and specification assertions for Python SDK Webhook Signature Verification failure paths (Issue #1670).
Verifies:
1. `sdk/python/tests/test_webhook_verification.py` exists and covers:
   - Positive validation cases (retained).
   - Tampered payload rejection.
   - Corrupted signature byte rejection.
   - Wrong key rejection.
   - Missing and invalid header prefix rejection.
   - Empty/whitespace header rejection.
   - Malformed base64 signature rejection.
   - Invalid signature length rejection.
   - Malformed and invalid public key length rejection.
2. The Python SDK test suite runs and exits cleanly with 100% passing tests.
"""
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEST_FILE = REPO_ROOT / "sdk" / "python" / "tests" / "test_webhook_verification.py"
SDK_DIR = REPO_ROOT / "sdk" / "python"


def test_webhook_verification_test_file_structure():
    assert TEST_FILE.exists(), f"Missing test file at {TEST_FILE}"
    content = TEST_FILE.read_text(encoding="utf-8")

    # Positive cases
    assert "test_sdk_verify_webhook_signature" in content
    assert "test_verify_webhook_signature_empty_payload" in content
    assert "test_verify_webhook_signature_utf8_payload" in content

    # Failure paths
    assert "test_verify_webhook_signature_tampered_payload" in content
    assert "test_verify_webhook_signature_corrupted_signature" in content
    assert "test_verify_webhook_signature_wrong_key" in content
    assert "test_verify_webhook_signature_missing_prefix" in content
    assert "test_verify_webhook_signature_wrong_prefix" in content
    assert "test_verify_webhook_signature_empty_or_whitespace_header" in content
    assert "test_verify_webhook_signature_malformed_base64_signature" in content
    assert "test_verify_webhook_signature_invalid_signature_length" in content
    assert "test_verify_webhook_signature_malformed_public_key" in content
    assert "test_verify_webhook_signature_invalid_public_key_length" in content


def test_webhook_verification_pytest_execution():
    env = os.environ.copy()
    env["PYTHONPATH"] = str(SDK_DIR)

    cmd = [sys.executable, "-m", "pytest", str(TEST_FILE), "-v"]
    proc = subprocess.run(
        cmd,
        cwd=str(SDK_DIR),
        capture_output=True,
        text=True,
        env=env,
    )
    assert proc.returncode == 0, f"pytest execution failed:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
    assert "13 passed" in proc.stdout
