import re
from pathlib import Path


def get_repo_root() -> Path:
    cur = Path(__file__).resolve()
    for parent in cur.parents:
        if (parent / ".git").exists() or (parent / "pyproject.toml").exists():
            return parent
    raise RuntimeError("Repository root could not be located")


def test_contract_event_serializer_marks_event_index_read_only():
    """SC-30 / Issue #1663: event_index must be in read_only_fields of ContractEventSerializer."""
    repo_root = get_repo_root()
    serializers_py = repo_root / "django-backend" / "soroscan" / "ingest" / "serializers.py"

    assert serializers_py.exists(), "serializers.py must exist"
    content = serializers_py.read_text(encoding="utf-8")

    # Locate ContractEventSerializer class definition
    match = re.search(
        r"class ContractEventSerializer\(.*?class Meta:.*?fields = \[(.*?)\].*?read_only_fields = \[(.*?)\]",
        content,
        re.DOTALL,
    )
    assert match is not None, "Could not locate ContractEventSerializer.Meta fields and read_only_fields"

    fields_block = match.group(1)
    read_only_block = match.group(2)

    # 1. event_index is in fields
    assert '"event_index"' in fields_block or "'event_index'" in fields_block, (
        "event_index must be declared in ContractEventSerializer.Meta.fields"
    )

    # 2. event_index is in read_only_fields
    assert '"event_index"' in read_only_block or "'event_index'" in read_only_block, (
        "event_index must be declared in ContractEventSerializer.Meta.read_only_fields"
    )

    # 3. status is also in read_only_fields
    assert '"status"' in read_only_block or "'status'" in read_only_block, (
        "status must be declared in ContractEventSerializer.Meta.read_only_fields"
    )
