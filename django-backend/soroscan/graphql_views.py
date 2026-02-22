"""
Custom GraphQL views with rate limiting support.
"""
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
        return super().dispatch(request, *args, **kwargs)
