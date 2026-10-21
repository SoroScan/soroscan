from __future__ import annotations

import re
from pathlib import Path
import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent
PACT_GUIDE = REPO_ROOT / "docs" / "testing" / "pact-contract-testing.md"
TESTING_INDEX = REPO_ROOT / "docs" / "testing" / "index.md"
PACTS_README = REPO_ROOT / "pacts" / "README.md"


def test_pact_guide_exists_and_has_required_sections():
    assert PACT_GUIDE.is_file(), "pact-contract-testing.md must exist"
    content = PACT_GUIDE.read_text(encoding="utf-8")

    assert "# Pact Contract Testing Guide" in content

    required_sections = [
        "## 1. Overview & Architecture",
        "## 2. Consumer Flow",
        "## 3. Provider Flow & Provider States",
        "## 4. Local Execution Commands",
        "## 5. CI/CD Workflow",
        "## 6. Troubleshooting Contract Mismatches",
    ]
    for section in required_sections:
        assert section in content, f"Pact guide missing section: {section}"

    # Verify key commands and configuration references
    assert "npm run test:pact" in content
    assert "test_pact_consumer.py" in content
    assert "test_provider_verification.py" in content
    assert "PACT_PROVIDER_STATES_ENABLED" in content


def test_testing_index_links_to_pact_guide():
    assert TESTING_INDEX.is_file(), "testing index.md must exist"
    index_content = TESTING_INDEX.read_text(encoding="utf-8")

    assert "pact-contract-testing.md" in index_content
    assert "Contract Testing (Pact)" in index_content


def test_pacts_readme_links_to_pact_guide():
    assert PACTS_README.is_file(), "pacts/README.md must exist"
    readme_content = PACTS_README.read_text(encoding="utf-8")

    assert "pact-contract-testing.md" in readme_content


def test_referenced_code_and_workflow_files_exist():
    referenced_files = [
        REPO_ROOT / "sdk" / "typescript" / "test" / "pact" / "consumer.pact.test.ts",
        REPO_ROOT / "sdk" / "python" / "tests" / "test_pact_consumer.py",
        REPO_ROOT / "django-backend" / "soroscan" / "pact_tests" / "test_provider_verification.py",
        REPO_ROOT / "django-backend" / "soroscan" / "pact_provider.py",
        REPO_ROOT / ".github" / "workflows" / "pact-tests.yml",
    ]
    for file_path in referenced_files:
        assert file_path.is_file(), f"Referenced file does not exist: {file_path}"
