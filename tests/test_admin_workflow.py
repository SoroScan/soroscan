from pathlib import Path
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
ADMIN_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "admin.yml"


def test_admin_workflow_parses_valid_yaml():
    assert ADMIN_WORKFLOW.exists(), "admin.yml workflow must exist"
    with open(ADMIN_WORKFLOW, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    assert isinstance(data, dict), "admin.yml must parse into a YAML mapping"


def test_admin_workflow_permissions_least_privilege():
    with open(ADMIN_WORKFLOW, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    perms = data.get("permissions")
    assert perms == {"contents": "read"}, f"Expected least privilege contents: read, got {perms}"


def test_admin_workflow_triggers_and_path_filters():
    with open(ADMIN_WORKFLOW, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    # Handled both yaml on-trigger variants
    triggers = data.get("on") or data.get(True)
    assert isinstance(triggers, dict), "Expected triggers map"
    assert "pull_request" in triggers, "Must trigger on pull_request"
    assert "push" in triggers, "Must trigger on push"

    pr_cfg = triggers["pull_request"]
    assert "admin/**" in pr_cfg.get("paths", []), "PR trigger must filter on admin/** paths"
    assert "dev" in pr_cfg.get("branches", []), "PR trigger must include dev branch"


def test_admin_workflow_contains_required_steps():
    with open(ADMIN_WORKFLOW, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    jobs = data.get("jobs", {})
    assert len(jobs) > 0, "Must define at least one job"
    main_job = next(iter(jobs.values()))
    steps = main_job.get("steps", [])

    step_runs = [s.get("run", "") for s in steps]
    assert any("npm install" in r for r in step_runs), "Must contain npm install step"
    assert any("npm run lint" in r or "npm lint" in r for r in step_runs), "Must contain lint step"
    assert any("npm test" in r for r in step_runs), "Must contain test step"
    assert any("npm run build" in r or "npm build" in r for r in step_runs), "Must contain build step"
