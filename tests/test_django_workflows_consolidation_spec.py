"""
Specification tests for Issue #1678:
Consolidation of duplicate Django test workflows into a canonical workflow with a unified 80% coverage threshold.
"""

from pathlib import Path
import re


REPO_ROOT = Path(__file__).resolve().parent.parent
WORKFLOWS_DIR = REPO_ROOT / ".github" / "workflows"


def test_only_single_canonical_django_test_workflow_exists():
    """Verify that django.yml was removed and only django-tests.yml remains as the canonical workflow."""
    django_yml = WORKFLOWS_DIR / "django.yml"
    django_tests_yml = WORKFLOWS_DIR / "django-tests.yml"

    assert not django_yml.exists(), "Duplicate workflow .github/workflows/django.yml must be deleted"
    assert django_tests_yml.exists(), "Canonical workflow .github/workflows/django-tests.yml must exist"


def test_single_documented_coverage_threshold():
    """Verify that a single canonical coverage gate (80%) is configured and 70% threshold is removed."""
    django_tests_yml = WORKFLOWS_DIR / "django-tests.yml"
    content = django_tests_yml.read_text(encoding="utf-8")

    assert "--cov-fail-under=80" in content, "Workflow must enforce 80% coverage threshold"
    assert "--cov-fail-under=70" not in content, "Obsolete 70% threshold must not appear"

    # Must be documented
    assert "80%" in content, "Coverage threshold should be documented in workflow comments"


def test_full_suite_checks_retained():
    """Verify that migrations check, pytest with coverage, linting, and rollback harness are all present."""
    django_tests_yml = WORKFLOWS_DIR / "django-tests.yml"
    content = django_tests_yml.read_text(encoding="utf-8")

    # Makemigrations dry run check
    assert "makemigrations --check --dry-run" in content

    # Pytest with coverage
    assert "pytest" in content
    assert "--cov=soroscan" in content

    # Ruff lint
    assert "ruff check" in content

    # Migration rollbacks job
    assert "migration-rollbacks:" in content
    assert "-m migration" in content


def test_references_to_deprecated_workflow_cleaned():
    """Verify README.md and documentation point to django-tests.yml and no dead links to django.yml remain."""
    readme_path = REPO_ROOT / "README.md"
    readme_content = readme_path.read_text(encoding="utf-8")
    assert "workflows/django.yml" not in readme_content
    assert "workflows/django-tests.yml" in readme_content

    iac_guide = REPO_ROOT / "docs" / "devops" / "iac-guide.md"
    if iac_guide.exists():
        iac_content = iac_guide.read_text(encoding="utf-8")
        assert ".github/workflows/django.yml" not in iac_content
        assert ".github/workflows/django-tests.yml" in iac_content
