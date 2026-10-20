from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
LIB_RS = REPO_ROOT / "soroban-contracts" / "soroscan_core" / "src" / "lib.rs"
TESTS_RS = REPO_ROOT / "soroban-contracts" / "soroscan_core" / "src" / "tests.rs"


def test_lib_rs_record_tagged_event_enforces_pause():
    assert LIB_RS.is_file(), f"File {LIB_RS} must exist"
    content = LIB_RS.read_text(encoding="utf-8")

    assert "pub fn record_tagged_event(" in content
    start = content.index("pub fn record_tagged_event(")
    end = content.index("pub fn latest_tagged_by_type(", start)
    fn_body = content[start:end]

    assert "if Self::is_paused(env.clone()) {" in fn_body, (
        "record_tagged_event must check Self::is_paused"
    )
    assert "return Err(ContractError::ContractPaused);" in fn_body, (
        "record_tagged_event must return ContractError::ContractPaused when paused"
    )


def test_tagged_event_aligns_with_record_event_pause_check():
    content = LIB_RS.read_text(encoding="utf-8")

    # record_event check
    start = content.index("pub fn record_event(")
    end = content.index("pub fn record_structured_event(", start)
    record_event_body = content[start:end]
    assert "if Self::is_paused(env.clone()) {" in record_event_body
    assert "return Err(ContractError::ContractPaused);" in record_event_body

    # record_tagged_event check
    start = content.index("pub fn record_tagged_event(")
    end = content.index("pub fn latest_tagged_by_type(", start)
    tagged_body = content[start:end]
    assert "if Self::is_paused(env.clone()) {" in tagged_body
    assert "return Err(ContractError::ContractPaused);" in tagged_body


def test_tests_rs_verifies_paused_tagged_events():
    assert TESTS_RS.is_file(), f"File {TESTS_RS} must exist"
    content = TESTS_RS.read_text(encoding="utf-8")

    assert "paused_contract_cannot_record_tagged_events" in content, (
        "tests.rs must contain paused_contract_cannot_record_tagged_events test"
    )
    assert "client.try_record_tagged_event" in content
    assert "ContractError::ContractPaused" in content
