from pathlib import Path
import yaml


def test_dependabot_config_exists_and_valid():
    repo_root = Path(__file__).resolve().parent.parent
    dependabot_file = repo_root / ".github" / "dependabot.yml"
    assert dependabot_file.is_file(), f"Dependabot configuration missing at {dependabot_file}"

    with open(dependabot_file, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    assert data.get("version") == 2, "Dependabot version must be 2"
    updates = data.get("updates", [])
    assert len(updates) > 0, "No update configurations found in dependabot.yml"


def test_dependabot_covers_all_ecosystems():
    repo_root = Path(__file__).resolve().parent.parent
    dependabot_file = repo_root / ".github" / "dependabot.yml"

    with open(dependabot_file, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    updates = data.get("updates", [])
    ecosystems = {u["package-ecosystem"] for u in updates}

    # All required ecosystems must be covered
    required_ecosystems = {"github-actions", "pip", "npm", "cargo"}
    assert required_ecosystems.issubset(ecosystems), f"Missing ecosystems: {required_ecosystems - ecosystems}"

    # Verify key directories for each ecosystem
    pip_dirs = {u["directory"] for u in updates if u["package-ecosystem"] == "pip"}
    assert "/django-backend" in pip_dirs
    assert "/sdk/python" in pip_dirs

    npm_dirs = {u["directory"] for u in updates if u["package-ecosystem"] == "npm"}
    assert "/soroscan-frontend" in npm_dirs
    assert "/admin" in npm_dirs
    assert "/sdk/typescript" in npm_dirs

    cargo_dirs = {u["directory"] for u in updates if u["package-ecosystem"] == "cargo"}
    assert any("soroscan_core" in d for d in cargo_dirs)


def test_dependabot_schedule_and_groups():
    repo_root = Path(__file__).resolve().parent.parent
    dependabot_file = repo_root / ".github" / "dependabot.yml"

    with open(dependabot_file, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    updates = data.get("updates", [])
    for u in updates:
        # Schedule interval must be weekly
        schedule = u.get("schedule", {})
        assert schedule.get("interval") == "weekly", f"Update for {u['directory']} is not weekly"

        # Target branch must be dev
        assert u.get("target-branch") == "dev", f"Update for {u['directory']} must target dev branch"

    # Groups must be configured for key high-traffic directories
    frontend_entry = next(u for u in updates if u["directory"] == "/soroscan-frontend")
    assert "groups" in frontend_entry, "Frontend dependencies should have grouping configured"

    backend_entry = next(u for u in updates if u["directory"] == "/django-backend")
    assert "groups" in backend_entry, "Backend dependencies should have grouping configured"
