"""
Tests asserting alignment between Jest coverage thresholds, Codecov policies,
and documented testing targets across SoroScan.
"""

from pathlib import Path
import re
import yaml
import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent
JEST_CONFIG_PATH = REPO_ROOT / "soroscan-frontend" / "jest.config.ts"
CODECOV_PATH = REPO_ROOT / "codecov.yml"
TESTING_DOC_PATH = REPO_ROOT / "docs" / "testing" / "index.md"


def test_jest_config_thresholds_match_enforced_policy():
    """Assert Jest config specifies exact baseline thresholds and comment matches policy."""
    assert JEST_CONFIG_PATH.is_file(), f"Missing {JEST_CONFIG_PATH}"
    content = JEST_CONFIG_PATH.read_text(encoding="utf-8")

    # Assert thresholds
    assert "lines: 40" in content
    assert "branches: 30" in content
    assert "functions: 35" in content
    assert "statements: 40" in content

    # Assert comment correctly identifies baseline thresholds and mentions Codecov 70% target
    assert "Baseline unit-test regression thresholds" in content
    assert "70% coverage target is enforced project-wide by Codecov" in content
    # Assert obsolete contradiction comment is removed
    assert "// Preserved the 70% threshold mandated by the issue" not in content


def test_codecov_enforces_70_percent_target():
    """Assert codecov.yml enforces 70% target on project and patch."""
    assert CODECOV_PATH.is_file(), f"Missing {CODECOV_PATH}"
    with open(CODECOV_PATH, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    coverage = config.get("coverage", {})
    status = coverage.get("status", {})

    project_default = status.get("project", {}).get("default", {})
    assert project_default.get("target") == "70%" or project_default.get("target") == 0.7

    patch_default = status.get("patch", {}).get("default", {})
    assert patch_default.get("target") == "70%" or patch_default.get("target") == 0.7


def test_testing_docs_documents_dual_tier_coverage():
    """Assert docs/testing/index.md documents the Jest baseline and Codecov 70% target."""
    assert TESTING_DOC_PATH.is_file(), f"Missing {TESTING_DOC_PATH}"
    content = TESTING_DOC_PATH.read_text(encoding="utf-8")

    assert "Coverage Policy and Thresholds" in content
    assert "Jest Baseline Unit-Test Gate" in content
    assert "Codecov Pull Request Quality Gate" in content
    assert "70%" in content
