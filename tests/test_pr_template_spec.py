from pathlib import Path
import re


def test_pr_template_exists_and_references_dev():
    repo_root = Path(__file__).resolve().parent.parent
    template_path = repo_root / ".github" / "PULL_REQUEST_TEMPLATE.md"

    assert template_path.exists(), f"PR template does not exist at {template_path}"

    content = template_path.read_text(encoding="utf-8")

    # Acceptance criteria:
    # 1. Template references `dev`
    assert re.search(r"PR is opened against [`']dev[`']", content), (
        "PR template must state that PR is opened against `dev`"
    )

    # 2. No develop/main-base wording remains
    assert "develop" not in content.lower(), (
        "PR template must not reference non-existent 'develop' branch"
    )
    assert not re.search(r"opened against.*main", content, re.IGNORECASE), (
        "PR template must not contain obsolete base wording referencing 'main'"
    )


def test_no_develop_branch_references_in_ci_and_docs():
    repo_root = Path(__file__).resolve().parent.parent
    frontend_tests_readme = repo_root / "soroscan-frontend" / "tests" / "README.md"

    if frontend_tests_readme.exists():
        content = frontend_tests_readme.read_text(encoding="utf-8")
        assert "main/develop" not in content, (
            "Frontend tests README must not reference 'main/develop'"
        )
        assert "main/dev" in content, (
            "Frontend tests README should reference 'main/dev'"
        )
