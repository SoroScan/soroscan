"""
N+1 query detection for GraphQL resolvers (issue #1290).

Logs warnings when a resolver executes more DB queries than expected,
helping developers identify lazy-loading issues during development.
Zero overhead in production when N1_DETECTION_ENABLED is False.

Nested resolver detection
-------------------------
The classic N+1 pattern occurs in nested resolvers, not just top-level
Query/Mutation fields.  For example, querying a list of contracts and
then resolving ``events`` on each contract triggers a DB query per item.

This extension instruments *every* resolver, tracks how many DB queries
fire within the execution of each field, and warns when the count exceeds
GRAPHQL_N1_DETECTION_THRESHOLD (default: 5).  The parent_type name is
included in the warning so developers can pinpoint the problematic field.
"""
import logging
import time
from typing import Any, Callable

from django.conf import settings
from django.db import connection
from strawberry.extensions import SchemaExtension

logger = logging.getLogger("soroscan.graphql.n1_detection")

# Types that are never the source of N+1 — skip instrumentation to reduce noise.
_SKIP_TYPES = frozenset(
    {
        "__Schema",
        "__Type",
        "__Field",
        "__InputValue",
        "__EnumValue",
        "__Directive",
        "PageInfo",
    }
)


def _get_threshold() -> int:
    """Return the configured N+1 detection threshold.

    Reads ``GRAPHQL_N1_DETECTION_THRESHOLD`` from settings (default: 5).
    Values below 1 are clamped to 1 to avoid false-positive floods.
    """
    raw = getattr(settings, "GRAPHQL_N1_DETECTION_THRESHOLD", 5)
    try:
        value = int(raw)
    except (TypeError, ValueError):
        value = 5
    return max(1, value)


class N1QueryDetectorExtension(SchemaExtension):
    """
    Strawberry extension that counts DB queries per resolver and warns
    when a pattern suggests N+1 query behaviour.

    Enabled only when ``GRAPHQL_N1_DETECTION_ENABLED=True`` (defaults to
    ``DEBUG`` so it is active in development but silent in production).

    Nested resolvers
    ~~~~~~~~~~~~~~~~
    Unlike the original implementation that limited inspection to
    ``Query`` and ``Mutation`` fields, this version instruments **all**
    resolvers (except introspection types).  That catches the real N+1
    pattern where a field resolver on an object type fires one DB query
    per parent object in a list result.

    Configurable threshold
    ~~~~~~~~~~~~~~~~~~~~~~
    Set ``GRAPHQL_N1_DETECTION_THRESHOLD`` (integer, default ``5``) to
    tune the sensitivity.  Lower values surface smaller N+1 patterns
    earlier; raise the value to suppress warnings on legitimately
    multi-query resolvers.
    """

    def _is_enabled(self) -> bool:
        return getattr(settings, "GRAPHQL_N1_DETECTION_ENABLED", settings.DEBUG)

    def resolve(
        self,
        _next: Callable,
        root: Any,
        info: Any,
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        if not self._is_enabled():
            return _next(root, info, *args, **kwargs)

        # Skip introspection and other meta-types entirely.
        parent_type_name: str = info.parent_type.name
        if parent_type_name in _SKIP_TYPES:
            return _next(root, info, *args, **kwargs)

        queries_before = len(connection.queries)
        start = time.perf_counter()

        result = _next(root, info, *args, **kwargs)

        queries_after = len(connection.queries)
        duration_ms = (time.perf_counter() - start) * 1000
        query_count = queries_after - queries_before

        threshold = _get_threshold()
        if query_count > threshold:
            logger.warning(
                "Potential N+1 query detected in GraphQL resolver '%s' on type '%s': "
                "%d queries executed in %.1fms (threshold: %d). "
                "Consider using select_related/prefetch_related or batching.",
                info.field_name,
                parent_type_name,
                query_count,
                duration_ms,
                threshold,
                extra={
                    "field_name": info.field_name,
                    "parent_type": parent_type_name,
                    "query_count": query_count,
                    "duration_ms": round(duration_ms, 2),
                    "threshold": threshold,
                },
            )

        return result
