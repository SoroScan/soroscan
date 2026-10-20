from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
LIB_RS = REPO_ROOT / "soroban-contracts" / "soroscan_core" / "src" / "lib.rs"
TESTS_RS = REPO_ROOT / "soroban-contracts" / "soroscan_core" / "src" / "tests.rs"


def test_lib_rs_record_tagged_event_bumps_indexer_count():
    assert LIB_RS.is_file(), f"File {LIB_RS} must exist"
    content = LIB_RS.read_text(encoding="utf-8")

    # Locate record_tagged_event definition
    assert "pub fn record_tagged_event(" in content
    tagged_start = content.index("pub fn record_tagged_event(")
    tagged_end = content.index("pub fn latest_tagged_by_type(", tagged_start)
    tagged_fn = content[tagged_start:tagged_end]

    # Verify that bump_indexer_count is called for the indexer
    assert "Self::bump_indexer_count(&env, &indexer, 1);" in tagged_fn, (
        "record_tagged_event must call Self::bump_indexer_count(&env, &indexer, 1)"
    )


def test_indexer_count_consistency_across_record_methods():
    content = LIB_RS.read_text(encoding="utf-8")

    # record_event calls bump_indexer_count(&env, &indexer, 1)
    record_event_start = content.index("pub fn record_event(")
    record_event_end = content.index("pub fn record_structured_event(", record_event_start)
    record_event_fn = content[record_event_start:record_event_end]
    assert "Self::bump_indexer_count(&env, &indexer, 1);" in record_event_fn

    # record_structured_event calls bump_indexer_count(&env, &indexer, 1)
    structured_start = content.index("pub fn record_structured_event(")
    structured_end = content.index("pub fn structured_by_correlation(", structured_start)
    structured_fn = content[structured_start:structured_end]
    assert "Self::bump_indexer_count(&env, &indexer, 1);" in structured_fn

    # record_tagged_event calls bump_indexer_count(&env, &indexer, 1)
    tagged_start = content.index("pub fn record_tagged_event(")
    tagged_end = content.index("pub fn latest_tagged_by_type(", tagged_start)
    tagged_fn = content[tagged_start:tagged_end]
    assert "Self::bump_indexer_count(&env, &indexer, 1);" in tagged_fn


def test_tests_rs_asserts_indexer_count_increment():
    assert TESTS_RS.is_file(), f"File {TESTS_RS} must exist"
    content = TESTS_RS.read_text(encoding="utf-8")

    assert "record_tagged_event_increments_indexer_count" in content, (
        "tests.rs must contain record_tagged_event_increments_indexer_count test"
    )
    assert "client.events_recorded_by(&indexer1)" in content
