from pathlib import Path
import re
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
DOCUSAURUS_CONFIG = REPO_ROOT / "soroscan-docs" / "docusaurus.config.ts"
DOCS_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "docs.yml"


def test_docusaurus_config_fails_on_broken_links():
    assert DOCUSAURUS_CONFIG.exists(), "docusaurus.config.ts must exist"
    content = DOCUSAURUS_CONFIG.read_text(encoding="utf-8")
    assert re.search(r"onBrokenLinks:\s*['\"]throw['\"]", content), "onBrokenLinks must be configured as 'throw'"
    assert re.search(r"onBrokenMarkdownLinks:\s*['\"]throw['\"]", content), "onBrokenMarkdownLinks must be configured as 'throw'"


def test_docs_workflow_parses_valid_yaml():
    assert DOCS_WORKFLOW.exists(), "docs.yml workflow must exist"
    with open(DOCS_WORKFLOW, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    assert isinstance(data, dict), "docs.yml must parse into a YAML mapping"


def test_docs_workflow_permissions_least_privilege():
    with open(DOCS_WORKFLOW, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    perms = data.get("permissions")
    assert perms == {"contents": "read"}, f"Expected least privilege contents: read, got {perms}"


def test_docs_workflow_paths_and_steps():
    with open(DOCS_WORKFLOW, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    triggers = data.get("on") or data.get(True)
    assert "pull_request" in triggers, "Must trigger on pull_request"
    assert "push" in triggers, "Must trigger on push"

    pr_paths = triggers["pull_request"].get("paths", [])
    assert "soroscan-docs/**" in pr_paths, "Must trigger on soroscan-docs/** changes"
    assert "docs/**" in pr_paths, "Must trigger on docs/** changes"

    jobs = data.get("jobs", {})
    main_job = next(iter(jobs.values()))
    steps = main_job.get("steps", [])
    step_runs = [s.get("run", "") for s in steps]

    assert any("npm ci" in r for r in step_runs), "Must install dependencies with npm ci"
    assert any("npm run build" in r for r in step_runs), "Must execute npm run build"
