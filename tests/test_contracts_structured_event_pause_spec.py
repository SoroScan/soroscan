from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
LIB_RS = REPO_ROOT / "soroban-contracts" / "soroscan_core" / "src" / "lib.rs"
TESTS_RS = REPO_ROOT / "soroban-contracts" / "soroscan_core" / "src" / "tests.rs"


def test_lib_rs_record_structured_event_enforces_pause():
    assert LIB_RS.is_file(), f"File {LIB_RS} must exist"
    content = LIB_RS.read_text(encoding="utf-8")

    # Locate record_structured_event definition
    assert "pub fn record_structured_event(" in content
    start = content.index("pub fn record_structured_event(")
    end = content.index("pub fn structured_by_correlation(", start)
    fn_body = content[start:end]

    # Verify is_paused check is present
    assert "if Self::is_paused(env.clone()) {" in fn_body, (
        "record_structured_event must check Self::is_paused"
    )
    assert "return Err(ContractError::ContractPaused);" in fn_body, (
        "record_structured_event must return ContractError::ContractPaused when paused"
    )


def test_pause_guard_consistency_across_contract_recording():
    content = LIB_RS.read_text(encoding="utf-8")

    # record_event check
    record_event_start = content.index("pub fn record_event(")
    record_event_end = content.index("pub fn record_structured_event(", record_event_start)
    record_event_body = content[record_event_start:record_event_end]
    assert "if Self::is_paused(env.clone()) {" in record_event_body
    assert "return Err(ContractError::ContractPaused);" in record_event_body

    # record_structured_event check
    structured_start = content.index("pub fn record_structured_event(")
    structured_end = content.index("pub fn structured_by_correlation(", structured_start)
    structured_body = content[structured_start:structured_end]
    assert "if Self::is_paused(env.clone()) {" in structured_body
    assert "return Err(ContractError::ContractPaused);" in structured_body

    # record_events_batch check
    batch_start = content.index("pub fn record_events_batch(")
    batch_end = content.index("fn bump_indexer_count(", batch_start)
    batch_body = content[batch_start:batch_end]
    assert "if Self::is_paused(env.clone()) {" in batch_body
    assert "return Err(ContractError::ContractPaused);" in batch_body


def test_tests_rs_verifies_paused_structured_events():
    assert TESTS_RS.is_file(), f"File {TESTS_RS} must exist"
    content = TESTS_RS.read_text(encoding="utf-8")

    assert "paused_contract_cannot_record_structured_events" in content, (
        "tests.rs must contain paused_contract_cannot_record_structured_events test"
    )
    assert "client.try_record_structured_event" in content
    assert "ContractError::ContractPaused" in content
