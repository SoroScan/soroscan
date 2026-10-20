import re
from pathlib import Path


def get_repo_root() -> Path:
    cur = Path(__file__).resolve()
    for parent in cur.parents:
        if (parent / ".git").exists() or (parent / "pyproject.toml").exists():
            return parent
    raise RuntimeError("Repository root could not be located")


def test_bulk_replay_dead_letters_restricts_to_staff_or_owner():
    """SC-30 / Issue #1664: bulk_replay_dead_letters must scope query by owner or staff."""
    repo_root = get_repo_root()
    views_py = repo_root / "django-backend" / "soroscan" / "v1" / "views.py"

    assert views_py.exists(), "v1/views.py must exist"
    content = views_py.read_text(encoding="utf-8")

    # Locate bulk_replay_dead_letters view function
    match = re.search(
        r"def bulk_replay_dead_letters\(request\):(.*?)(?=\n@|\Z)",
        content,
        re.DOTALL,
    )
    assert match is not None, "Could not locate bulk_replay_dead_letters in v1/views.py"
    func_body = match.group(1)

    # 1. Permission check on staff
    assert "request.user.is_staff" in func_body, (
        "bulk_replay_dead_letters must check if user is staff"
    )

    # 2. Filtering by contract owner for non-staff
    assert "subscription__contract__owner=request.user" in func_body, (
        "bulk_replay_dead_letters must filter dead letters by subscription__contract__owner for non-staff"
    )

    # 3. select_related includes subscription__contract
    assert "subscription__contract" in func_body, (
        "select_related must traverse subscription__contract"
    )
