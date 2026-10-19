from pathlib import Path
import tomllib
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent


def test_gitleaks_toml_is_valid_toml():
    config_file = REPO_ROOT / ".gitleaks.toml"
    assert config_file.exists(), ".gitleaks.toml must exist"
    with open(config_file, "rb") as f:
        data = tomllib.load(f)
    assert isinstance(data, dict), ".gitleaks.toml must parse into a dict"
    assert "allowlist" in data, ".gitleaks.toml must define an [allowlist]"
    allowlist = data["allowlist"]
    assert "paths" in allowlist and len(allowlist["paths"]) > 0, "allowlist must define paths"
    assert "regexes" in allowlist and len(allowlist["regexes"]) > 0, "allowlist must define regexes"
    assert "stopwords" in allowlist and len(allowlist["stopwords"]) > 0, "allowlist must define stopwords"


def test_pre_commit_config_contains_gitleaks_hook():
    pre_commit_file = REPO_ROOT / ".pre-commit-config.yaml"
    assert pre_commit_file.exists(), ".pre-commit-config.yaml must exist"
    with open(pre_commit_file, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    assert isinstance(data, dict), ".pre-commit-config.yaml must parse into a dict"
    repos = data.get("repos", [])
    gitleaks_repo = None
    for r in repos:
        if "gitleaks/gitleaks" in r.get("repo", ""):
            gitleaks_repo = r
            break
    assert gitleaks_repo is not None, "Gitleaks repo must be configured in .pre-commit-config.yaml"
    hook_ids = [h.get("id") for h in gitleaks_repo.get("hooks", [])]
    assert "gitleaks" in hook_ids, "Gitleaks hook 'gitleaks' must be present"


def test_secret_scanning_workflow_invariants():
    workflow_file = REPO_ROOT / ".github" / "workflows" / "secret-scanning.yml"
    assert workflow_file.exists(), "secret-scanning.yml must exist"
    with open(workflow_file, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    assert isinstance(data, dict), "secret-scanning.yml must parse into a dict"

    # Least-privilege permissions
    perms = data.get("permissions")
    assert perms == {"contents": "read"}, f"Expected least privilege contents: read, got {perms}"

    # Verify gitleaks step
    jobs = data.get("jobs", {})
    assert "gitleaks" in jobs, "Must define a 'gitleaks' job"
    steps = jobs["gitleaks"].get("steps", [])
    step_uses = [s.get("uses", "") for s in steps]
    assert any("actions/checkout" in u for u in step_uses), "Must use actions/checkout"
    assert any("gitleaks/gitleaks-action" in u for u in step_uses), "Must use gitleaks-action"

    checkout_step = next(s for s in steps if "actions/checkout" in s.get("uses", ""))
    assert checkout_step.get("with", {}).get("fetch-depth") == 0, "Checkout step must fetch full depth (fetch-depth: 0) for git history secret scanning"
