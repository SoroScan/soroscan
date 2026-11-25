"""
GET /api/dev/summary/ — high-level Dev UI overview endpoint.

Counts are derived from:
  - Unfinished issues: parsed from CONTRIBUTING.md / README.md TODO/FIXME markers,
    with a static fallback when the files are absent.
  - Active contributors: distinct User rows active in the last 90 days.
  - Recent PRs: mock data (no GitHub token required).
"""
import logging
import re
from pathlib import Path

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)

# Repo root is two levels above this file (django-backend/soroscan/ → repo root)
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent

_MARKDOWN_CANDIDATES = [
    _REPO_ROOT / "CONTRIBUTING.md",
    _REPO_ROOT / "README.md",
    _REPO_ROOT / "TODO.md",
]

_TODO_RE = re.compile(r"\bTODO\b|\bFIXME\b|\b\[ \]\b", re.IGNORECASE)


def _count_unfinished_issues() -> dict:
    """
    Parse markdown files for TODO / FIXME / unchecked-checkbox markers.
    Returns a dict with `count` and `source`.
    """
    total = 0
    sources = []
    for path in _MARKDOWN_CANDIDATES:
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
            found = len(_TODO_RE.findall(text))
            if found:
                total += found
                sources.append(path.name)
        except OSError:
            continue

    if sources:
        return {"count": total, "source": ", ".join(sources)}
    # Static fallback
    return {"count": 12, "source": "static_fallback"}


def _count_active_contributors() -> int:
    """Users who have logged in within the last 90 days."""
    User = get_user_model()
    cutoff = timezone.now() - timedelta(days=90)
    try:
        return User.objects.filter(last_login__gte=cutoff).count()
    except Exception:
        logger.warning("Could not query active contributors", exc_info=True)
        return 0


_MOCK_PRS = [
    {"id": 1, "title": "Add security audit signals", "state": "merged", "author": "dev1"},
    {"id": 2, "title": "Dev UI summary endpoint", "state": "open", "author": "dev2"},
    {"id": 3, "title": "Fix slow-query logger rotation", "state": "merged", "author": "dev1"},
    {"id": 4, "title": "GraphQL introspection toggle", "state": "closed", "author": "dev3"},
    {"id": 5, "title": "Celery beat schedule cleanup", "state": "open", "author": "dev2"},
]


@api_view(["GET"])
@permission_classes([AllowAny])
def dev_summary_view(request):
    """
    Returns a high-level project summary for the Dev UI.

    Response shape:
    {
        "unfinished_issues": {"count": int, "source": str},
        "active_contributors": int,
        "recent_prs": [{"id", "title", "state", "author"}, ...]
    }
    """
    issues = _count_unfinished_issues()
    contributors = _count_active_contributors()

    return Response(
        {
            "unfinished_issues": issues,
            "active_contributors": contributors,
            "recent_prs": _MOCK_PRS,
        }
    )
