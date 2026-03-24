"""
Custom GraphQL views with rate limiting and schema versioning support.
"""
from strawberry.django.views import GraphQLView
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from soroscan.throttles import IngestRateThrottle
from soroscan.ingest.schema import SCHEMA_VERSION_V1, SCHEMA_VERSION_V2


class ThrottledGraphQLView(GraphQLView):
    """
    GraphQL view with rate limiting support.

    Applies DRF throttling to the GraphQL endpoint to prevent abuse.
    Subclasses set ``schema_version`` to tag the request for the
    deprecation-tracking middleware.
    """

    schema_version: str = SCHEMA_VERSION_V1

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.anon_throttle = AnonRateThrottle()
        self.user_throttle = UserRateThrottle()
        self.ingest_throttle = IngestRateThrottle()

    def get_throttles(self, request):
        return [self.anon_throttle, self.user_throttle]

    def check_throttles(self, request):
        for throttle in self.get_throttles(request):
            if not throttle.allow_request(request, self):
                self.throttle_failure()

    def throttle_failure(self):
        from rest_framework.exceptions import Throttled
        raise Throttled(detail="Rate limit exceeded. Please try again later.")

    def dispatch(self, request, *args, **kwargs):
        self.check_throttles(request)
        # Tag the request so GraphQLDeprecationMiddleware can attach the
        # X-GraphQL-Schema-Version response header.
        request._graphql_schema_version = self.schema_version
        return super().dispatch(request, *args, **kwargs)


class GraphQLViewV1(ThrottledGraphQLView):
    """Versioned view for /graphql/v1/ — full schema including deprecated fields."""
    schema_version = SCHEMA_VERSION_V1


class GraphQLViewV2(ThrottledGraphQLView):
    """Versioned view for /graphql/v2/ — clean schema, deprecated fields removed."""
    schema_version = SCHEMA_VERSION_V2
