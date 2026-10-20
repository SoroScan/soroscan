import os
import re
from pathlib import Path


def get_repo_root() -> Path:
    cur = Path(__file__).resolve()
    for parent in cur.parents:
        if (parent / ".git").exists() or (parent / "pyproject.toml").exists():
            return parent
    raise RuntimeError("Repository root could not be located")


def test_project_status_figures_and_links():
    repo_root = get_repo_root()
    status_doc = repo_root / "docs" / "PROJECT_STATUS.md"
    assert status_doc.exists(), "docs/PROJECT_STATUS.md must exist"

    content = status_doc.read_text(encoding="utf-8")

    # 1. Document is dated
    assert "October 20, 2026" in content, (
        "docs/PROJECT_STATUS.md must be dated to current date"
    )

    # 2. Migration count aligns with repo
    migrations_dir = repo_root / "django-backend" / "soroscan" / "ingest" / "migrations"
    migration_files = [f for f in migrations_dir.glob("*.py")]
    # Total migration files (including __init__.py is 76, or excluding is 75)
    assert "76 migrations" in content or f"{len(migration_files)} migrations" in content, (
        "docs/PROJECT_STATUS.md must reflect actual migration figures"
    )

    # 3. Referenced workflows exist in .github/workflows
    workflow_refs = ["django-tests.yml", "frontend-ci.yml", "chaos-tests.yml", "failover-tests.yml", "load-tests.yml"]
    for wf in workflow_refs:
        wf_path = repo_root / ".github" / "workflows" / wf
        assert wf_path.exists(), f"Referenced workflow {wf} does not exist at {wf_path}"
        assert wf in content, f"Workflow {wf} should be listed in docs/PROJECT_STATUS.md"

    # 4. Check for regeneration instructions
    assert "How to Regenerate" in content, "docs/PROJECT_STATUS.md must include instructions on how to regenerate"

    # 5. Ensure all relative links resolve
    link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
    for text, target in link_pattern.findall(content):
        target = target.strip()
        if target.startswith(("http://", "https://", "mailto:", "#")):
            continue
        clean_target = target.split("#")[0].split("?")[0]
        if not clean_target:
            continue
        resolved_path = (status_doc.parent / clean_target).resolve()
        assert resolved_path.exists(), (
            f"Broken link in docs/PROJECT_STATUS.md: [{text}]({target}) -> {resolved_path}"
        )

    # 6. Ensure no forbidden hardcoded workspace URIs
    assert "file:///workspaces/" not in content
