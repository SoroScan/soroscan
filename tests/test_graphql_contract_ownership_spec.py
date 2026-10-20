from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PY = REPO_ROOT / "django-backend" / "soroscan" / "ingest" / "schema.py"
TEST_SCHEMA_PY = REPO_ROOT / "django-backend" / "soroscan" / "ingest" / "tests" / "test_schema.py"


def test_schema_py_update_contract_enforces_ownership():
    assert SCHEMA_PY.is_file(), f"File {SCHEMA_PY} must exist"
    content = SCHEMA_PY.read_text(encoding="utf-8")

    assert "def update_contract(" in content
    start = content.index("def update_contract(")
    end = content.index("class Subscription:", start)
    fn_body = content[start:end]

    # Verify ownership and team membership enforcement
    assert "is_owner = contract.owner_id == user.id" in fn_body
    assert "TeamMembership.objects.filter(" in fn_body
    assert "if not (is_owner or is_team_member):" in fn_body
    assert 'raise Exception("Not authorized to update this contract")' in fn_body


def test_test_schema_py_covers_ownership_and_team():
    assert TEST_SCHEMA_PY.is_file(), f"File {TEST_SCHEMA_PY} must exist"
    content = TEST_SCHEMA_PY.read_text(encoding="utf-8")

    assert "def test_update_contract_forbidden_for_non_owner(" in content
    assert "Not authorized to update this contract" in content
    assert "def test_update_contract_allowed_for_team_member(" in content
