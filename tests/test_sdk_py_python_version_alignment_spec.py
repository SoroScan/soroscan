"""
Specification assertions for Python SDK declared version and PEP 604 annotations alignment (Issue #1669).
Verifies:
1. `sdk/python/pyproject.toml` declares `requires-python = ">=3.10"`.
2. Classifiers align with Python 3.10+ (no EOL 3.8/3.9).
3. `sdk/python/soroscan/models.py` imports `from __future__ import annotations`.
4. `import soroscan` and Pydantic model schemas load cleanly.
"""
import importlib
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SDK_DIR = REPO_ROOT / "sdk" / "python"
PYPROJECT_PATH = SDK_DIR / "pyproject.toml"
MODELS_PATH = SDK_DIR / "soroscan" / "models.py"


def test_pyproject_declared_python_version():
    assert PYPROJECT_PATH.exists(), f"Missing {PYPROJECT_PATH}"
    content = PYPROJECT_PATH.read_text(encoding="utf-8")

    assert 'requires-python = ">=3.10"' in content
    assert '"Programming Language :: Python :: 3.8"' not in content
    assert '"Programming Language :: Python :: 3.9"' not in content
    assert '"Programming Language :: Python :: 3.10"' in content


def test_models_future_annotations_present():
    assert MODELS_PATH.exists(), f"Missing {MODELS_PATH}"
    content = MODELS_PATH.read_text(encoding="utf-8")
    assert "from __future__ import annotations" in content


def test_soroscan_import_and_models_load():
    if str(SDK_DIR) not in sys.path:
        sys.path.insert(0, str(SDK_DIR))

    import soroscan
    from soroscan.models import TrackedContract, ContractEvent, WebhookSubscription

    assert soroscan is not None
    # Validate that PEP 604 type annotations evaluate properly in Pydantic v2
    fields = TrackedContract.model_fields
    assert "abi_schema" in fields
    assert "last_indexed_ledger" in fields
