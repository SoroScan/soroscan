"""
Custom throttle classes for SoroScan API rate limiting.
"""
from rest_framework.throttling import SimpleRateThrottle


class IngestRateThrottle(SimpleRateThrottle):
    """
    Stricter rate limit for the ingest endpoint (POST /api/ingest/record/).
    
    This throttle is applied to write operations that require more
    restrictive limits to prevent abuse of the indexer ingest endpoint.
    """
    scope = "ingest"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident
        }

    def throttle_failure(self):
        """
        Handle throttle failure by returning a 429 response with Retry-After header.
        """
        return None  # Use default DRF throttle failure behavior


class GraphQLRateThrottle(SimpleRateThrottle):
    """
    Rate limit specifically for GraphQL endpoints.
    
    GraphQL endpoints can be vulnerable to expensive queries,
    so they require separate rate limiting configuration.
    """
    scope = "graphql"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident
        }
