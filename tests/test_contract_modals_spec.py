"""
Specification test guarding contract modal components test suites (Issue #1715).
Verifies that:
1. RegisterModal, DeleteConfirmModal, and BackfillModal components and test files exist.
2. Acceptance criteria are covered:
   - Modal open/close covered across all three modal components.
   - Submit and validation paths covered (empty fields, success payload, error handling).
   - Deleting and progress status covered.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

REGISTER_MODAL = (
    REPO_ROOT
    / "soroscan-frontend"
    / "app"
    / "contracts"
    / "components"
    / "RegisterModal.tsx"
)
DELETE_MODAL = (
    REPO_ROOT
    / "soroscan-frontend"
    / "app"
    / "contracts"
    / "components"
    / "DeleteConfirmModal.tsx"
)
BACKFILL_MODAL = (
    REPO_ROOT
    / "soroscan-frontend"
    / "app"
    / "contracts"
    / "[id]"
    / "components"
    / "BackfillModal.tsx"
)

REGISTER_TEST = (
    REPO_ROOT
    / "soroscan-frontend"
    / "app"
    / "contracts"
    / "components"
    / "__tests__"
    / "RegisterModal.test.tsx"
)
DELETE_TEST = (
    REPO_ROOT
    / "soroscan-frontend"
    / "app"
    / "contracts"
    / "components"
    / "__tests__"
    / "DeleteConfirmModal.test.tsx"
)
BACKFILL_TEST = (
    REPO_ROOT
    / "soroscan-frontend"
    / "app"
    / "contracts"
    / "components"
    / "__tests__"
    / "BackfillModal.test.tsx"
)
ROOT_TEST = (
    REPO_ROOT
    / "soroscan-frontend"
    / "__tests__"
    / "contract-modals.test.tsx"
)


def test_contract_modal_files_exist():
    assert REGISTER_MODAL.is_file(), f"Missing: {REGISTER_MODAL}"
    assert DELETE_MODAL.is_file(), f"Missing: {DELETE_MODAL}"
    assert BACKFILL_MODAL.is_file(), f"Missing: {BACKFILL_MODAL}"
    assert REGISTER_TEST.is_file(), f"Missing: {REGISTER_TEST}"
    assert DELETE_TEST.is_file(), f"Missing: {DELETE_TEST}"
    assert BACKFILL_TEST.is_file(), f"Missing: {BACKFILL_TEST}"
    assert ROOT_TEST.is_file(), f"Missing: {ROOT_TEST}"


def test_register_modal_test_covers_validation_and_submit():
    content = REGISTER_TEST.read_text(encoding="utf-8")

    assert "describe(\"Open and Close Behaviour\"" in content
    assert "describe(\"Validation Paths\"" in content
    assert "Contract ID is required" in content
    assert "Name is required" in content
    assert "submits valid form data" in content
    assert "handles onSubmit failure" in content


def test_delete_confirm_modal_test_covers_confirm_and_delete_states():
    content = DELETE_TEST.read_text(encoding="utf-8")

    assert "describe(\"Open and Close Behaviour\"" in content
    assert "describe(\"Confirm and Deleting States\"" in content
    assert "calls onConfirm when clicking DELETE button" in content
    assert "disables buttons and displays DELETING... when isDeleting is true" in content


def test_backfill_modal_test_covers_tasks_and_progress():
    content = BACKFILL_TEST.read_text(encoding="utf-8")

    assert "describe(\"Open and Close Behaviour\"" in content
    assert "describe(\"Task Data Rendering\"" in content
    assert "renders fallback message when task is null" in content
    assert "renders running task with progress bar" in content
    assert "renders completed task status properly" in content
    assert "renders failed task status and error message" in content
