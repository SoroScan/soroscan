from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWS_PY = REPO_ROOT / "django-backend" / "soroscan" / "ingest" / "views.py"
TEST_VIEWS_PY = REPO_ROOT / "django-backend" / "soroscan" / "ingest" / "tests" / "test_views.py"


def test_views_py_guards_teamless_contract_in_upload_source():
    assert VIEWS_PY.is_file(), f"File {VIEWS_PY} must exist"
    content = VIEWS_PY.read_text(encoding="utf-8")

    assert "def upload_source(" in content
    start = content.index("def upload_source(")
    end = content.index("def verify_source(", start)
    fn_body = content[start:end]

    # Verify no unguarded contract.team.members call
    assert "contract.team.members.filter" not in fn_body, (
        "Unguarded contract.team.members call must be eliminated"
    )

    # Verify contract.team is checked for None
    assert "if contract.team is not None:" in fn_body or "if contract.team:" in fn_body
    assert 'return Response({"error": "Permission denied"}, status=403)' in fn_body


def test_test_views_py_covers_teamless_upload_source_permissions():
    assert TEST_VIEWS_PY.is_file(), f"File {TEST_VIEWS_PY} must exist"
    content = TEST_VIEWS_PY.read_text(encoding="utf-8")

    assert "class TestUploadSourcePermissions:" in content
    assert "def test_upload_source_non_owner_teamless_returns_403(" in content
    assert "def test_upload_source_team_member_allowed(" in content
    assert "def test_upload_source_ownerless_teamless_returns_403(" in content
