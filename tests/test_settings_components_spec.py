"""
Specification test guarding Settings components test suite (Issue #1713).
Verifies that:
1. All settings components and test files exist.
2. Acceptance criteria are covered:
   - Tests cover each settings section (Account, Notifications, API Keys, Theme, Billing, SettingsShell).
   - Validation and save behaviour asserted across interactive settings.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

SETTINGS_DIR = REPO_ROOT / "soroscan-frontend" / "app" / "settings"
COMPONENTS_DIR = SETTINGS_DIR / "components"
TESTS_DIR = COMPONENTS_DIR / "__tests__"
ROOT_TEST = REPO_ROOT / "soroscan-frontend" / "__tests__" / "settings-components.test.tsx"


def test_settings_files_exist():
    # Components
    assert (COMPONENTS_DIR / "AccountSettings.tsx").is_file()
    assert (COMPONENTS_DIR / "NotificationPrefs.tsx").is_file()
    assert (COMPONENTS_DIR / "APIKeyManager.tsx").is_file()
    assert (COMPONENTS_DIR / "ThemeSelector.tsx").is_file()
    assert (COMPONENTS_DIR / "BillingOverview.tsx").is_file()
    assert (SETTINGS_DIR / "SettingsShell.tsx").is_file()

    # Tests
    assert (TESTS_DIR / "AccountSettings.test.tsx").is_file()
    assert (TESTS_DIR / "NotificationPrefs.test.tsx").is_file()
    assert (TESTS_DIR / "APIKeyManager.test.tsx").is_file()
    assert (TESTS_DIR / "ThemeSelector.test.tsx").is_file()
    assert (TESTS_DIR / "BillingOverview.test.tsx").is_file()
    assert (TESTS_DIR / "SettingsShell.test.tsx").is_file()
    assert ROOT_TEST.is_file()


def test_account_settings_test_covers_validation_and_save():
    content = (TESTS_DIR / "AccountSettings.test.tsx").read_text(encoding="utf-8")
    assert "fails validation and prevents save" in content
    assert "fails validation when email is formatted incorrectly" in content
    assert "saves valid profile to localStorage" in content
    assert "PROFILE SAVED" in content


def test_notification_prefs_test_covers_toggle_and_save():
    content = (TESTS_DIR / "NotificationPrefs.test.tsx").read_text(encoding="utf-8")
    assert "toggles webhook option and renders webhook URL input" in content
    assert "saves preferences to localStorage and shows saved confirmation" in content
    assert "SAVED" in content


def test_api_key_manager_test_covers_crud_and_clipboard():
    content = (TESTS_DIR / "APIKeyManager.test.tsx").read_text(encoding="utf-8")
    assert "generates a new key and persists it to localStorage" in content
    assert "copies API key to clipboard" in content
    assert "revokes an API key via confirmation dialog" in content


def test_settings_shell_test_covers_tab_orchestration():
    content = (TESTS_DIR / "SettingsShell.test.tsx").read_text(encoding="utf-8")
    assert "renders settings header and navigation tabs" in content
    assert "navigates to another tab and replaces URL query param" in content
    assert "renders active panel based on URL search params" in content
