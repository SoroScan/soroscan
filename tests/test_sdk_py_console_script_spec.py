"""
Specification tests for Issue #1612:
feat(sdk-py): register the soroscan console script entry point in pyproject.toml.
"""

from pathlib import Path
import tomllib
import pytest
import sys
import io

REPO_ROOT = Path(__file__).resolve().parent.parent
PYPROJECT_TOML = REPO_ROOT / "sdk" / "python" / "pyproject.toml"


def test_pyproject_toml_declares_console_script():
    """Verify pyproject.toml declares [project.scripts] with soroscan pointing to soroscan.cli:main."""
    content = PYPROJECT_TOML.read_text(encoding="utf-8")
    data = tomllib.loads(content)

    project = data.get("project", {})
    scripts = project.get("scripts", {})

    assert "soroscan" in scripts, "[project.scripts] must declare 'soroscan' entrypoint"
    assert scripts["soroscan"] == "soroscan.cli:main", "soroscan entrypoint must point to 'soroscan.cli:main'"


def test_cli_main_callable_and_help():
    """Verify soroscan.cli:main exists and `--help` exits cleanly with code 0."""
    sys.path.insert(0, str(REPO_ROOT / "sdk" / "python"))
    from soroscan.cli import main

    captured = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = captured

    try:
        with pytest.raises(SystemExit) as exc_info:
            main(["--help"])
        assert exc_info.value.code == 0
    finally:
        sys.stdout = old_stdout

    output = captured.getvalue()
    assert "Standalone CLI for querying SoroScan events" in output or "usage: soroscan" in output
    assert "--help" in output


def test_cli_version_flag():
    """Verify `--version` exits cleanly with code 0."""
    sys.path.insert(0, str(REPO_ROOT / "sdk" / "python"))
    from soroscan.cli import main
    from soroscan import __version__

    captured = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = captured

    try:
        with pytest.raises(SystemExit) as exc_info:
            main(["--version"])
        assert exc_info.value.code == 0
    finally:
        sys.stdout = old_stdout

    output = captured.getvalue()
    assert __version__ in output or "0.1.0" in output
