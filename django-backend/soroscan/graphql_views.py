"""
Custom GraphQL views with rate limiting support.
"""
import json
from typing import Any

from django.conf import settings
from django.http import JsonResponse
from graphql import parse
from graphql.language.ast import FieldNode, FragmentSpreadNode, InlineFragmentNode, OperationDefinitionNode
from strawberry.django.views import GraphQLView
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from soroscan.throttles import IngestRateThrottle


class ThrottledGraphQLView(GraphQLView):
    """
    GraphQL view with rate limiting support.
    
    Applies DRF throttling to GraphQL endpoint to prevent abuse.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Initialize throttle classes
        self.anon_throttle = AnonRateThrottle()
        self.user_throttle = UserRateThrottle()
        self.ingest_throttle = IngestRateThrottle()
    
    def get_throttles(self, request):
        """Return list of throttle instances to check."""
        return [self.anon_throttle, self.user_throttle]

    def _extract_queries(self, request) -> list[str]:
        if request.method == "GET":
            query = request.GET.get("query")
            return [query] if query else []

        if request.method != "POST":
            return []

        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except Exception:
            return []

        if isinstance(payload, list):
            return [item.get("query") for item in payload if isinstance(item, dict) and item.get("query")]
        if isinstance(payload, dict) and payload.get("query"):
            return [payload["query"]]
        return []

    def _field_depth(self, node, fragments: dict[str, Any], depth: int = 0) -> int:
        if not getattr(node, "selection_set", None):
            return depth

        max_depth = depth
        for selection in node.selection_set.selections:
            if isinstance(selection, FieldNode):
                max_depth = max(max_depth, self._field_depth(selection, fragments, depth + 1))
            elif isinstance(selection, InlineFragmentNode):
                max_depth = max(max_depth, self._field_depth(selection, fragments, depth + 1))
            elif isinstance(selection, FragmentSpreadNode):
                fragment = fragments.get(selection.name.value)
                if fragment is not None:
                    max_depth = max(max_depth, self._field_depth(fragment, fragments, depth + 1))
        return max_depth

    def _query_depth(self, query: str) -> int | None:
        try:
            doc = parse(query)
        except Exception:
            return None

        fragments = {
            definition.name.value: definition
            for definition in doc.definitions
            if getattr(definition, "name", None) is not None
        }
        depths: list[int] = []
        for definition in doc.definitions:
            if isinstance(definition, OperationDefinitionNode):
                depths.append(self._field_depth(definition, fragments, 0))
        return max(depths) if depths else 0

    def _validate_depth(self, request):
        max_depth = getattr(settings, "MAX_QUERY_DEPTH", 15)
        for query in self._extract_queries(request):
            depth = self._query_depth(query)
            if depth is not None and depth > max_depth:
                return JsonResponse(
                    {
                        "errors": [
                            {
                                "message": (
                                    f"GraphQL query depth {depth} exceeds the maximum allowed depth "
                                    f"of {max_depth}."
                                )
                            }
                        ]
                    },
                    status=400,
                )
        return None
    
    def check_throttles(self, request):
        """Check if request should be throttled."""
        for throttle in self.get_throttles(request):
            if not throttle.allow_request(request, self):
                self.throttle_failure()
    
    def throttle_failure(self):
        """Handle throttle failure - raise 429."""
        from rest_framework.exceptions import Throttled
        raise Throttled(detail='Rate limit exceeded. Please try again later.')
    
    def dispatch(self, request, *args, **kwargs):
        """Override dispatch to add throttling check."""
        # Check throttles before processing
        self.check_throttles(request)
        depth_error = self._validate_depth(request)
        if depth_error is not None:
            return depth_error
        return super().dispatch(request, *args, **kwargs)
