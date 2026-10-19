from pathlib import Path
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
SDK_RELEASE_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "sdk-release.yml"


def test_sdk_release_workflow_parses_valid_yaml():
    assert SDK_RELEASE_WORKFLOW.exists(), "sdk-release.yml must exist"
    with open(SDK_RELEASE_WORKFLOW, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    assert isinstance(data, dict), "sdk-release.yml must parse into a YAML mapping"


def test_sdk_release_workflow_triggers():
    with open(SDK_RELEASE_WORKFLOW, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    triggers = data.get("on") or data.get(True)
    tags = triggers.get("push", {}).get("tags", [])
    assert any("sdk-typescript-v" in t for t in tags), "Must trigger on sdk-typescript-v* tags"
    assert any("sdk-python-v" in t for t in tags), "Must trigger on sdk-python-v* tags"

    pr_paths = triggers.get("pull_request", {}).get("paths", [])
    assert any("sdk/typescript" in p for p in pr_paths), "Must trigger on sdk/typescript/** changes in PRs"


def test_sdk_release_typescript_jobs_invariants():
    with open(SDK_RELEASE_WORKFLOW, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    jobs = data.get("jobs", {})
    assert "verify-typescript-pr" in jobs, "Must define verify-typescript-pr job"
    assert "publish-typescript" in jobs, "Must define publish-typescript job"

    # Verify PR job has build and dry-run
    pr_steps = jobs["verify-typescript-pr"].get("steps", [])
    pr_runs = [s.get("run", "") for s in pr_steps]
    assert any("npm run build" in r for r in pr_runs), "PR job must run build"
    assert any("npm publish --dry-run" in r for r in pr_runs), "PR job must run publish dry-run"

    # Verify release job has tag matching and npm publish
    rel_steps = jobs["publish-typescript"].get("steps", [])
    rel_runs = [s.get("run", "") for s in rel_steps]
    assert any("package.json" in r and "TAG" in r for r in rel_runs), "Release job must validate tag against package.json version"
    assert any("npm publish" in r and "--provenance" in r for r in rel_runs), "Release job must publish with provenance"
