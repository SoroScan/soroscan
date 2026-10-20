"""
Specification tests for Issue #1606:
refactor(contracts): remove unused topic constants (TOPIC_TRANSFER, TOPIC_UPGRADE).
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TOPICS_RS = REPO_ROOT / "soroban-contracts" / "soroscan_core" / "src" / "topics.rs"
LIB_RS = REPO_ROOT / "soroban-contracts" / "soroscan_core" / "src" / "lib.rs"


def test_unused_topic_constants_removed():
    """Verify dead topic constants TOPIC_TRANSFER and TOPIC_UPGRADE are removed from topics.rs."""
    content = TOPICS_RS.read_text(encoding="utf-8")

    assert "TOPIC_TRANSFER" not in content, "TOPIC_TRANSFER must be removed"
    assert "TOPIC_UPGRADE" not in content, "TOPIC_UPGRADE must be removed"


def test_canonical_root_topic_preserved():
    """Verify TOPIC_SOROSCAN is preserved and correctly exported."""
    content = TOPICS_RS.read_text(encoding="utf-8")

    assert 'pub const TOPIC_SOROSCAN: &str = "soroscan";' in content


def test_lib_rs_imports_only_canonical_topic():
    """Verify lib.rs only imports and references the canonical TOPIC_SOROSCAN."""
    lib_content = LIB_RS.read_text(encoding="utf-8")

    assert "use crate::topics::TOPIC_SOROSCAN;" in lib_content
    assert "TOPIC_TRANSFER" not in lib_content
    assert "TOPIC_UPGRADE" not in lib_content
