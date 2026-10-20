"""
Specification tests for Issue #1613:
feat(sdk-ts): send custom User-Agent header and export DEFAULT_USER_AGENT.
"""

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
SDK_TS_SRC = REPO_ROOT / "sdk" / "typescript" / "src"


def test_default_user_agent_constant_exported():
    """Verify DEFAULT_USER_AGENT is defined as 'SoroScan-TS-SDK/1.4.0' and exported."""
    types_file = SDK_TS_SRC / "types.ts"
    client_file = SDK_TS_SRC / "client.ts"
    index_file = SDK_TS_SRC / "index.ts"

    types_content = types_file.read_text(encoding="utf-8")
    assert 'DEFAULT_USER_AGENT = "SoroScan-TS-SDK/1.4.0"' in types_content or "DEFAULT_USER_AGENT = 'SoroScan-TS-SDK/1.4.0'" in types_content
    assert "export const DEFAULT_USER_AGENT" in types_content or "export { DEFAULT_USER_AGENT" in types_content

    client_content = client_file.read_text(encoding="utf-8")
    assert "DEFAULT_USER_AGENT" in client_content
    assert "export { DEFAULT_USER_AGENT" in client_content or "export const DEFAULT_USER_AGENT" in client_content

    index_content = index_file.read_text(encoding="utf-8")
    assert "DEFAULT_USER_AGENT" in index_content


def test_client_initializes_and_sends_user_agent():
    """Verify SoroScanClient stores userAgent and attaches User-Agent header in #request."""
    client_file = SDK_TS_SRC / "client.ts"
    client_content = client_file.read_text(encoding="utf-8")

    # Field declaration
    assert "readonly #userAgent: string;" in client_content

    # Constructor initialization
    assert "this.#userAgent = config.userAgent ?? DEFAULT_USER_AGENT;" in client_content

    # Headers inclusion
    assert '"User-Agent": this.#userAgent' in client_content or "'User-Agent': this.#userAgent" in client_content


def test_user_agent_unit_tests_present():
    """Verify unit test file contains assertions for both default and custom User-Agent."""
    test_file = REPO_ROOT / "sdk" / "typescript" / "test" / "client.test.ts"
    test_content = test_file.read_text(encoding="utf-8")

    assert "sends the default SDK User-Agent" in test_content
    assert 'expect(DEFAULT_USER_AGENT).toBe("SoroScan-TS-SDK/1.4.0")' in test_content
    assert 'expect(sentHeaders()["User-Agent"]).toBe("SoroScan-TS-SDK/1.4.0")' in test_content
    assert "uses a custom userAgent when provided" in test_content
    assert 'expect(sentHeaders()["User-Agent"]).toBe("my-app/2.0")' in test_content
