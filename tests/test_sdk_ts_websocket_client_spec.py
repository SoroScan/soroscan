import subprocess
from pathlib import Path


def test_websocket_client_nodenext_import_and_explicit_types():
    repo_root = Path(__file__).resolve().parent.parent
    client_file = repo_root / "sdk" / "typescript" / "src" / "websocket-client.ts"
    assert client_file.is_file(), f"File not found: {client_file}"

    content = client_file.read_text(encoding="utf-8")

    # Verify import extension for NodeNext
    assert 'from "./types.js"' in content, "Expected './types.js' import extension in websocket-client.ts"
    assert 'from "./types"' not in content, "Unsuffixed './types' import still present in websocket-client.ts"

    # Verify explicit type annotation on eventTopic parameter
    assert "(eventTopic: ContractEventTopic)" in content, "Expected explicit '(eventTopic: ContractEventTopic)' annotation"


def test_websocket_client_test_suite_passes():
    repo_root = Path(__file__).resolve().parent.parent
    sdk_dir = repo_root / "sdk" / "typescript"

    result = subprocess.run(
        ["npm", "test", "src/websocket-client.test.ts"],
        cwd=sdk_dir,
        capture_output=True,
        text=True,
        shell=True,
    )

    assert result.returncode == 0, f"Vitest websocket tests failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
    assert "19 passed" in result.stdout
