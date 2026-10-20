"""
Unit tests asserting that pre-commit CI workflow and configuration
meet all project invariants, permissions, and quality gates.
"""

from pathlib import Path
import yaml
import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent
WORKFLOW_PATH = REPO_ROOT / ".github" / "workflows" / "pre-commit.yml"
CONFIG_PATH = REPO_ROOT / ".pre-commit-config.yaml"


def test_pre_commit_workflow_exists_and_valid():
    """Assert .github/workflows/pre-commit.yml exists and is valid YAML."""
    assert WORKFLOW_PATH.is_file(), f"Workflow file not found at {WORKFLOW_PATH}"
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    assert isinstance(data, dict), "Workflow YAML must parse as a dictionary"
    assert data.get("name") == "Pre-Commit"


def test_pre_commit_workflow_triggers_and_permissions():
    """Assert workflow triggers on push/pull_request and enforces least-privilege permissions."""
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    # Check triggers
    on_clause = data.get("on") or data.get(True)  # YAML may parse 'on' as True
    assert on_clause is not None, "Workflow must declare 'on' trigger events"

    if isinstance(on_clause, dict):
        assert "push" in on_clause or "pull_request" in on_clause
        if "push" in on_clause and isinstance(on_clause["push"], dict):
            branches = on_clause["push"].get("branches", [])
            assert "dev" in branches or "main" in branches
        if "pull_request" in on_clause and isinstance(on_clause["pull_request"], dict):
            branches = on_clause["pull_request"].get("branches", [])
            assert "dev" in branches or "main" in branches

    # Check least-privilege permissions
    perms = data.get("permissions")
    assert perms is not None, "Workflow must explicitly declare permissions"
    assert perms.get("contents") == "read", "Workflow must restrict contents to 'read'"


def test_pre_commit_workflow_job_steps():
    """Assert workflow defines pre-commit execution step."""
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    jobs = data.get("jobs", {})
    assert len(jobs) > 0, "Workflow must declare at least one job"

    pre_commit_job = jobs.get("pre-commit")
    assert pre_commit_job is not None, "Workflow must contain a 'pre-commit' job"
    assert pre_commit_job.get("runs-on") == "ubuntu-latest"

    steps = pre_commit_job.get("steps", [])
    step_uses = [step.get("uses", "") for step in steps]

    assert any("actions/checkout" in u for u in step_uses), "Job must check out repository"
    assert any("actions/setup-python" in u for u in step_uses), "Job must set up Python"
    assert any(
        "pre-commit/action" in step.get("uses", "")
        or "pre-commit" in str(step.get("run", ""))
        for step in steps
    ), "Job must invoke pre-commit"


def test_pre_commit_config_valid_and_complete():
    """Assert .pre-commit-config.yaml is valid and configures all expected hooks."""
    assert CONFIG_PATH.is_file(), f"Config file not found at {CONFIG_PATH}"
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    assert isinstance(config, dict), "Pre-commit config must parse as dictionary"
    repos = config.get("repos", [])
    assert len(repos) >= 4, "Config must define hook repositories"

    hook_ids = []
    for r in repos:
        for h in r.get("hooks", []):
            hook_ids.append(h.get("id"))

    expected_hooks = [
        "trailing-whitespace",
        "end-of-file-fixer",
        "check-yaml",
        "black",
        "flake8",
        "isort",
    ]
    for expected in expected_hooks:
        assert expected in hook_ids, f"Required hook '{expected}' missing from .pre-commit-config.yaml"
