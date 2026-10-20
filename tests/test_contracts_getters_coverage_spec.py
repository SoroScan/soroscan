"""
Specification tests for issue #1666:
test(contracts): cover structured_by_correlation and latest_tagged_by_type getters
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def test_core_getters_exist_in_lib():
    lib_rs = BASE_DIR / "soroban-contracts" / "soroscan_core" / "src" / "lib.rs"
    assert lib_rs.exists(), f"lib.rs must exist at {lib_rs}"

    content = lib_rs.read_text(encoding="utf-8")

    assert "pub fn structured_by_correlation(" in content
    assert "pub fn latest_tagged_by_type(" in content
    assert "DataKey::StructuredByCorrelation(" in content
    assert "DataKey::LatestTaggedByType(" in content


def test_core_tests_cover_structured_by_correlation():
    tests_rs = BASE_DIR / "soroban-contracts" / "soroscan_core" / "src" / "tests.rs"
    assert tests_rs.exists(), f"tests.rs must exist at {tests_rs}"

    content = tests_rs.read_text(encoding="utf-8")

    assert "fn structured_by_correlation_getter_retrieval_and_absent()" in content
    assert "client.structured_by_correlation(" in content
    assert "assert_eq!(client.structured_by_correlation(&correlation_id), None);" in content
    assert "assert_eq!(record.correlation_id, correlation_id);" in content


def test_core_tests_cover_latest_tagged_by_type():
    tests_rs = BASE_DIR / "soroban-contracts" / "soroscan_core" / "src" / "tests.rs"
    content = tests_rs.read_text(encoding="utf-8")

    assert "fn latest_tagged_by_type_getter_retrieval_and_absent()" in content
    assert "client.latest_tagged_by_type(" in content
    assert "assert_eq!(client.latest_tagged_by_type(&event_type), None);" in content
    assert "assert_eq!(latest.payload_hash, payload_hash2);" in content
