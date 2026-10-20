import subprocess
from pathlib import Path
import yaml


def test_issue_templates_directory_structure():
    repo_root = Path(__file__).resolve().parent.parent
    template_dir = repo_root / ".github" / "ISSUE_TEMPLATE"
    assert template_dir.is_dir(), f"Missing template directory at {template_dir}"

    bug_report = template_dir / "bug_report.md"
    feature_request = template_dir / "feature_request.md"
    config_file = template_dir / "config.yml"

    assert bug_report.is_file(), f"Missing bug_report.md at {bug_report}"
    assert feature_request.is_file(), f"Missing feature_request.md at {feature_request}"
    assert config_file.is_file(), f"Missing config.yml at {config_file}"


def test_bug_report_template_content():
    repo_root = Path(__file__).resolve().parent.parent
    bug_report = repo_root / ".github" / "ISSUE_TEMPLATE" / "bug_report.md"
    content = bug_report.read_text(encoding="utf-8")

    assert content.startswith("---"), "Template must start with YAML frontmatter"
    parts = content.split("---", 2)
    assert len(parts) >= 3, "Invalid frontmatter separation"

    frontmatter = yaml.safe_load(parts[1])
    assert frontmatter.get("name") == "Bug Report"
    assert "bug" in frontmatter.get("labels", [])

    body = parts[2]
    assert "Describe the Bug" in body
    assert "Steps to Reproduce" in body
    assert "Expected Behavior" in body
    assert "Environment" in body
    assert "Affected Components" in body


def test_feature_request_template_content():
    repo_root = Path(__file__).resolve().parent.parent
    feature_request = repo_root / ".github" / "ISSUE_TEMPLATE" / "feature_request.md"
    content = feature_request.read_text(encoding="utf-8")

    assert content.startswith("---"), "Template must start with YAML frontmatter"
    parts = content.split("---", 2)
    assert len(parts) >= 3, "Invalid frontmatter separation"

    frontmatter = yaml.safe_load(parts[1])
    assert frontmatter.get("name") == "Feature Request"
    assert "enhancement" in frontmatter.get("labels", [])

    body = parts[2]
    assert "Summary of the Feature" in body
    assert "Problem Statement" in body
    assert "Proposed Solution" in body
    assert "Affected Components" in body


def test_config_yml_content():
    repo_root = Path(__file__).resolve().parent.parent
    config_file = repo_root / ".github" / "ISSUE_TEMPLATE" / "config.yml"

    with open(config_file, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    assert data.get("blank_issues_enabled") is False, "Blank issues should be disabled"
    contact_links = data.get("contact_links", [])
    assert len(contact_links) > 0, "Contact links should be present"
