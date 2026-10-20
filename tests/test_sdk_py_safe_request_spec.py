"""
Specification tests for issue #1668:
fix(sdk-py): route requests through _safe_request for typed errors
"""

import ast
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def test_no_raw_client_http_calls_in_sdk():
    client_py = BASE_DIR / "sdk" / "python" / "soroscan" / "client.py"
    assert client_py.exists(), f"client.py must exist at {client_py}"

    content = client_py.read_text(encoding="utf-8")
    tree = ast.parse(content)

    raw_client_http_calls = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            # Check for self._client.<method>(...) where method in (get, post, patch, delete, put)
            func = node.func
            if (
                isinstance(func, ast.Attribute)
                and isinstance(func.value, ast.Attribute)
                and isinstance(func.value.value, ast.Name)
                and func.value.value.id == "self"
                and func.value.attr == "_client"
                and func.attr in {"get", "post", "patch", "delete", "put"}
            ):
                raw_client_http_calls.append((node.lineno, func.attr))

    assert not raw_client_http_calls, (
        f"Found {len(raw_client_http_calls)} raw self._client HTTP calls that bypass _safe_request: "
        f"{raw_client_http_calls}"
    )


def test_safe_request_definitions_exist():
    client_py = BASE_DIR / "sdk" / "python" / "soroscan" / "client.py"
    content = client_py.read_text(encoding="utf-8")
    tree = ast.parse(content)

    sync_safe_request = False
    async_safe_request = False

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            if node.name == "SoroScanClient":
                for item in node.body:
                    if isinstance(item, ast.FunctionDef) and item.name == "_safe_request":
                        sync_safe_request = True
            elif node.name == "AsyncSoroScanClient":
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)) and item.name == "_safe_request":
                        async_safe_request = True

    assert sync_safe_request, "SoroScanClient must define _safe_request"
    assert async_safe_request, "AsyncSoroScanClient must define _safe_request"


def test_safe_request_handles_typed_exceptions():
    client_py = BASE_DIR / "sdk" / "python" / "soroscan" / "client.py"
    content = client_py.read_text(encoding="utf-8")

    assert "SoroScanTimeoutError" in content
    assert "SoroScanConnectionError" in content
    assert "httpx.TimeoutException" in content
    assert "httpx.ConnectError" in content
    assert "httpx.NetworkError" in content
