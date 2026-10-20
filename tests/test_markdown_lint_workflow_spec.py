import json
import subprocess
import tempfile
from pathlib import Path
import yaml


def test_markdown_lint_workflow_spec():
    repo_root = Path(__file__).resolve().parent.parent
    workflow_path = repo_root / ".github" / "workflows" / "markdown-lint.yml"
    assert workflow_path.is_file(), f"Workflow not found: {workflow_path}"

    with open(workflow_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    # Check triggers (handle PyYAML parsing 'on' as boolean True)
    on_block = data.get("on") or data.get(True) or {}
    pr_paths = on_block.get("pull_request", {}).get("paths", [])
    assert "**/*.md" in pr_paths, "Missing **/*.md in PR trigger paths"
    assert "**/*.mdx" in pr_paths, "Missing **/*.mdx in PR trigger paths"

    # Check action steps
    steps = data.get("jobs", {}).get("markdownlint", {}).get("steps", [])
    cli2_step = next((s for s in steps if "markdownlint-cli2" in s.get("uses", "")), None)
    assert cli2_step is not None, "Missing markdownlint-cli2-action step"

    globs = cli2_step.get("with", {}).get("globs", "")
    assert "**/*.md" in globs
    assert "**/*.mdx" in globs


def test_markdownlint_config_files():
    repo_root = Path(__file__).resolve().parent.parent
    config_json = repo_root / ".markdownlint.json"
    cli2_config = repo_root / ".markdownlint-cli2.jsonc"

    assert config_json.is_file(), f"Missing .markdownlint.json at repo root"
    assert cli2_config.is_file(), f"Missing .markdownlint-cli2.jsonc at repo root"

    with open(config_json, "r", encoding="utf-8") as f:
        rules = json.load(f)
    assert rules.get("default") is True

    cli2_raw = cli2_config.read_text(encoding="utf-8")
    assert "**/*.md" in cli2_raw
    assert "**/*.mdx" in cli2_raw
    assert "docs/api-reference/**" in cli2_raw


def test_markdownlint_runs_clean_on_codebase():
    repo_root = Path(__file__).resolve().parent.parent
    result = subprocess.run(
        ["npx", "--yes", "markdownlint-cli2"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        shell=True,
    )
    combined = f"{result.stdout}\n{result.stderr}"
    assert result.returncode == 0, f"markdownlint-cli2 failed on codebase:\n{combined}"
    assert "0 issues in 0 files" in combined or "Summary: 0 issues" in combined


def test_markdownlint_fails_on_violations():
    repo_root = Path(__file__).resolve().parent.parent
    with tempfile.NamedTemporaryFile("w", suffix=".md", dir=repo_root, delete=False, encoding="utf-8") as f:
        # Heading without space after hash violates MD018
        f.write("#NoSpaceHeading\n\n[ space inside ](https://example.com)\n")
        temp_file = Path(f.name)

    try:
        result = subprocess.run(
            ["npx", "--yes", "markdownlint-cli2", temp_file.name],
            cwd=repo_root,
            capture_output=True,
            text=True,
            shell=True,
        )
        assert result.returncode != 0, "markdownlint-cli2 should fail when violations are present"
        combined = f"{result.stdout}\n{result.stderr}"
        assert "MD018" in combined or "MD039" in combined, f"Expected MD018 or MD039 in output:\n{combined}"
    finally:
        if temp_file.exists():
            temp_file.unlink()
