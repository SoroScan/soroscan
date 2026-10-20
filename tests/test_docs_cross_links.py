import os
import re
from pathlib import Path


def get_repo_root() -> Path:
    # django-backend/soroscan/ingest/tests -> repo_root
    cur = Path(__file__).resolve()
    for parent in cur.parents:
        if (parent / ".git").exists() or (parent / "pyproject.toml").exists():
            return parent
    raise RuntimeError("Repository root could not be located")


def test_docs_cross_links_resolve_correctly():
    """Verify documentation cross-links in modified doc files resolve to existing files."""
    repo_root = get_repo_root()
    target_docs = [
        repo_root / "docs" / "security" / "webhook_signing.md",
        repo_root / "docs" / "testing" / "reliability.md",
        repo_root / "docs" / "troubleshooting" / "guide.md",
        repo_root / "docs" / "contributing" / "community-standards.md",
        repo_root / "docs" / "contributing" / "documentation-guide.md",
        repo_root / "docs" / "deployment" / "README.md",
    ]

    link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')

    for doc_path in target_docs:
        assert doc_path.exists(), f"Target documentation file does not exist: {doc_path}"
        content = doc_path.read_text(encoding="utf-8")

        # 1. Ensure no hardcoded dev container paths remain
        assert "file:///workspaces/" not in content, (
            f"Found forbidden hardcoded workspace URI in {doc_path}"
        )

        # 2. Extract and resolve all relative markdown/file links
        for text, target in link_pattern.findall(content):
            target = target.strip()
            # Ignore external links, mailto, and pure fragment anchors
            if target.startswith(("http://", "https://", "mailto:", "#")):
                continue

            # Strip fragments and query parameters
            clean_target = target.split("#")[0].split("?")[0]
            if not clean_target:
                continue

            resolved_path = (doc_path.parent / clean_target).resolve()
            assert resolved_path.exists(), (
                f"Broken cross-link in {doc_path.name}: [{text}]({target}) "
                f"resolves to non-existent path {resolved_path}"
            )
