from pathlib import Path
import pytest
import yaml

VALID_PERMISSION_SCOPES = {
    "actions",
    "checks",
    "contents",
    "deployments",
    "discussions",
    "id-token",
    "issues",
    "packages",
    "pages",
    "pull-requests",
    "repository-projects",
    "security-events",
    "statuses",
}

VALID_PERMISSION_VALUES = {"read", "write", "none"}

WORKFLOWS_DIR = Path(__file__).resolve().parent.parent / ".github" / "workflows"


def get_workflow_files():
    files = sorted(WORKFLOWS_DIR.glob("*.yml"))
    assert len(files) > 0, "No workflow files found in .github/workflows"
    return files


def test_all_workflows_parse_valid_yaml():
    for wf in get_workflow_files():
        with open(wf, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            assert isinstance(data, dict), f"{wf.name} did not parse into a top-level YAML mapping"


def test_all_workflows_declare_top_level_permissions():
    missing = []
    for wf in get_workflow_files():
        with open(wf, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            perms = data.get("permissions")
            if perms is None:
                missing.append(wf.name)
    assert not missing, f"Workflows missing top-level permissions declaration: {missing}"


def test_permissions_are_valid_scopes_and_values():
    for wf in get_workflow_files():
        with open(wf, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            perms = data.get("permissions")
            if perms == "read-all" or perms == "write-all":
                # Special GitHub Actions shortcut strings
                continue
            assert isinstance(perms, dict), f"{wf.name} permissions must be a mapping, got {type(perms)}"
            assert len(perms) > 0, f"{wf.name} permissions block cannot be empty"
            for scope, val in perms.items():
                assert scope in VALID_PERMISSION_SCOPES, f"{wf.name} has invalid permission scope: {scope}"
                assert val in VALID_PERMISSION_VALUES, f"{wf.name} has invalid permission value for {scope}: {val}"


def test_non_release_workflows_enforce_least_privilege_read_only():
    write_allowed_workflows = {
        "changelog.yml",  # Needs to create a release/changelog pull-request
    }
    for wf in get_workflow_files():
        if wf.name in write_allowed_workflows:
            continue
        with open(wf, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            perms = data.get("permissions")
            assert isinstance(perms, dict)
            for scope, val in perms.items():
                assert val in ("read", "none"), f"{wf.name} requests elevated write permissions on scope '{scope}'"
