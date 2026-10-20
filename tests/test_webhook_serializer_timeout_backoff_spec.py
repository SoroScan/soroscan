import re
from pathlib import Path


def get_repo_root() -> Path:
    cur = Path(__file__).resolve()
    for parent in cur.parents:
        if (parent / ".git").exists() or (parent / "pyproject.toml").exists():
            return parent
    raise RuntimeError("Repository root could not be located")


def test_webhook_subscription_serializer_exposes_timeout_and_backoff():
    repo_root = get_repo_root()
    serializers_py = repo_root / "django-backend" / "soroscan" / "ingest" / "serializers.py"
    models_py = repo_root / "django-backend" / "soroscan" / "ingest" / "models.py"

    assert serializers_py.exists(), "serializers.py must exist"
    assert models_py.exists(), "models.py must exist"

    serializers_content = serializers_py.read_text(encoding="utf-8")
    models_content = models_py.read_text(encoding="utf-8")

    # 1. Models define the expected fields
    assert "timeout_seconds = models.IntegerField" in models_content
    assert "retry_backoff_strategy = models.CharField" in models_content
    assert "retry_backoff_seconds = models.PositiveIntegerField" in models_content

    # 2. WebhookSubscriptionSerializer includes the three fields in Meta.fields
    # Locate WebhookSubscriptionSerializer class definition
    match = re.search(r"class WebhookSubscriptionSerializer\(.*?class Meta:.*?fields = \[(.*?)\]", serializers_content, re.DOTALL)
    assert match is not None, "Could not locate WebhookSubscriptionSerializer.Meta.fields"
    fields_block = match.group(1)

    for field in ["timeout_seconds", "retry_backoff_strategy", "retry_backoff_seconds"]:
        assert f'"{field}"' in fields_block or f"'{field}'" in fields_block, (
            f"Field {field} must be exposed in WebhookSubscriptionSerializer.Meta.fields"
        )

    # 3. Validation logic exists
    assert "def validate_timeout_seconds" in serializers_content
    assert "def validate_retry_backoff_seconds" in serializers_content
