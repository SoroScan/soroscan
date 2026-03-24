"""
GraphQL deprecation-tracking middleware for SoroScan.

Intercepts GraphQL responses to:
1. Detect deprecated field usage in the executed operation.
2. Add an ``X-GraphQL-Deprecations`` response header listing the deprecated
   fields that were queried.
3. Log deprecation usage to Sentry (when configured) for analytics.
4. Attach the schema version tag (v1/v2) to the request context so views
   can include it in response headers.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)


class GraphQLDeprecationMiddleware:
    """
    Django middleware that post-processes GraphQL responses to surface
    deprecated field usage via response headers and Sentry breadcrumbs.

    Only activates on paths that start with ``/graphql``.
    """

    GRAPHQL_PATH_PREFIX = "/graphql"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if not request.path.startswith(self.GRAPHQL_PATH_PREFIX):
            return response

        # Only inspect JSON responses from POST requests (GraphQL operations)
        if request.method != "POST":
            return response

        content_type = response.get("Content-Type", "")
        if "application/json" not in content_type:
            return response

        try:
            body = response.content.decode("utf-8")
            data = json.loads(body)
        except (UnicodeDecodeError, json.JSONDecodeError):
            return response

        deprecated_fields = _collect_deprecated_fields(data)

        if deprecated_fields:
            header_value = ", ".join(sorted(deprecated_fields))
            response["X-GraphQL-Deprecations"] = header_value

            logger.warning(
                "GraphQL deprecated fields used: %s (path=%s)",
                header_value,
                request.path,
                extra={
                    "deprecated_fields": list(deprecated_fields),
                    "graphql_path": request.path,
                },
            )

            _report_to_sentry(deprecated_fields, request)

        # Attach schema version header if set by the view
        schema_version = getattr(request, "_graphql_schema_version", None)
        if schema_version:
            response["X-GraphQL-Schema-Version"] = schema_version

        return response


def _collect_deprecated_fields(response_data: Any) -> set[str]:
    """
    Walk the GraphQL response extensions for deprecation notices.

    Strawberry surfaces deprecated field usage in
    ``response.extensions.deprecations`` when the schema is built with
    ``enable_federation_2=False`` (default).  We also scan the ``errors``
    array for deprecation-related messages as a fallback.
    """
    deprecated: set[str] = set()

    if not isinstance(response_data, dict):
        return deprecated

    # Primary path: extensions.deprecations (Strawberry ≥ 0.200)
    extensions = response_data.get("extensions") or {}
    deprecations = extensions.get("deprecations") or []
    if isinstance(deprecations, list):
        for item in deprecations:
            if isinstance(item, dict):
                field = item.get("field") or item.get("name") or ""
                if field:
                    deprecated.add(field)
            elif isinstance(item, str):
                deprecated.add(item)

    # Fallback: scan errors for deprecation hints
    errors = response_data.get("errors") or []
    for error in errors:
        if not isinstance(error, dict):
            continue
        msg = (error.get("message") or "").lower()
        if "deprecated" in msg or "sunset" in msg:
            # Best-effort: extract field name from path
            path = error.get("path") or []
            if path:
                deprecated.add(".".join(str(p) for p in path))

    return deprecated


def _report_to_sentry(deprecated_fields: set[str], request) -> None:
    """Send a Sentry breadcrumb/event for deprecated field usage analytics."""
    if not getattr(settings, "SENTRY_DSN", ""):
        return

    try:
        import sentry_sdk  # noqa: PLC0415

        with sentry_sdk.push_scope() as scope:
            scope.set_tag("graphql.deprecated_fields", ", ".join(sorted(deprecated_fields)))
            scope.set_tag("graphql.path", request.path)
            scope.set_context(
                "graphql_deprecations",
                {
                    "fields": sorted(deprecated_fields),
                    "path": request.path,
                    "method": request.method,
                },
            )
            sentry_sdk.add_breadcrumb(
                category="graphql.deprecation",
                message=f"Deprecated fields used: {', '.join(sorted(deprecated_fields))}",
                level="warning",
                data={
                    "fields": sorted(deprecated_fields),
                    "path": request.path,
                },
            )
            # Capture as a low-severity event so it appears in Sentry issues
            sentry_sdk.capture_message(
                f"GraphQL deprecated field usage: {', '.join(sorted(deprecated_fields))}",
                level="warning",
            )
    except Exception:
        # Never let Sentry reporting break the response
        logger.debug("Failed to report deprecation to Sentry", exc_info=True)
