"""
Specification test guarding FilterBuilderModal test suite (Issue #1716).
Verifies that:
1. FilterBuilderModal component exists and test files exist.
2. Acceptance criteria are covered:
   - Add/remove rule behaviour covered (add condition, remove condition, add group, remove group).
   - Generated expression asserted (single rule, compound rule with logic operator, onSave callback).
   - Tab switching between build and test tabs.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
COMPONENT_FILE = (
    REPO_ROOT
    / "soroscan-frontend"
    / "app"
    / "webhooks"
    / "components"
    / "FilterBuilderModal.tsx"
)
TEST_FILE_COMPONENT = (
    REPO_ROOT
    / "soroscan-frontend"
    / "app"
    / "webhooks"
    / "components"
    / "__tests__"
    / "FilterBuilderModal.test.tsx"
)
TEST_FILE_ROOT = (
    REPO_ROOT
    / "soroscan-frontend"
    / "__tests__"
    / "filter-builder-modal.test.tsx"
)


def test_filter_builder_modal_files_exist():
    assert COMPONENT_FILE.is_file(), f"Component missing: {COMPONENT_FILE}"
    assert TEST_FILE_COMPONENT.is_file(), f"Component test missing: {TEST_FILE_COMPONENT}"
    assert TEST_FILE_ROOT.is_file(), f"Root test missing: {TEST_FILE_ROOT}"


def test_test_file_covers_add_remove_rule_criteria():
    content = TEST_FILE_COMPONENT.read_text(encoding="utf-8")

    assert "describe(\"Add and Remove Rule Behaviour\"" in content
    assert "adds a condition rule when clicking CONDITION button" in content
    assert "removes a condition rule when clicking remove button" in content
    assert "adds and removes sub-groups" in content
    assert "resets rules when clicking RESET button" in content


def test_test_file_covers_generated_expression_and_save():
    content = TEST_FILE_COMPONENT.read_text(encoding="utf-8")

    assert "describe(\"Generated Expression and Save Interaction\"" in content
    assert "updates generated expression when modifying field, operator and value" in content
    assert "asserts compound generated expression across multiple rules and logic operators" in content
    assert "calls onSave with serialized expression and expression tree" in content


def test_test_file_covers_tabs_and_controls():
    content = TEST_FILE_COMPONENT.read_text(encoding="utf-8")

    assert "describe(\"Visibility and Dialog Controls\"" in content
    assert "describe(\"Tab Navigation\"" in content
    assert "switches between BUILD and TEST tabs" in content
