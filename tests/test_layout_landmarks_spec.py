from pathlib import Path
import re


def test_app_shell_has_no_duplicate_main_or_skip_link():
    repo_root = Path(__file__).resolve().parent.parent
    app_shell_path = (
        repo_root
        / "soroscan-frontend"
        / "components"
        / "layout"
        / "AppShell.tsx"
    )

    assert app_shell_path.exists(), f"AppShell must exist at {app_shell_path}"

    content = app_shell_path.read_text(encoding="utf-8")

    # 1. Must not contain duplicate skip link
    assert not re.search(r'href="#main-content"', content), (
        "AppShell must not contain duplicate skip link to #main-content"
    )

    # 2. Must not contain <main id="main-content">
    assert not re.search(r'<main[^>]*id="main-content"', content), (
        "AppShell must not define duplicate <main id='main-content'>"
    )

    # 3. Must not render a <main> landmark tag
    assert not re.search(r'<main[\s>]', content), (
        "AppShell must delegate the main landmark to the root layout"
    )


def test_root_layout_defines_single_main_landmark_and_skip_link():
    repo_root = Path(__file__).resolve().parent.parent
    layout_path = repo_root / "soroscan-frontend" / "app" / "layout.tsx"

    assert layout_path.exists(), f"layout.tsx must exist at {layout_path}"

    content = layout_path.read_text(encoding="utf-8")

    # 1. Must render SkipToContent
    assert "<SkipToContent />" in content, (
        "Root layout must render SkipToContent"
    )

    # 2. Must render single main landmark with id="main-content" and tabIndex={-1}
    assert re.search(r'<main[^>]*id="main-content"', content), (
        "Root layout must define <main id='main-content'>"
    )
    assert 'tabIndex={-1}' in content, (
        "Root layout main content must have tabIndex={-1} for skip link focus"
    )
