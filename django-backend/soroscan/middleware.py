"""
Middleware for request-scoped log context (request_id).
"""
import uuid

from .log_context import set_request_id


class RequestIdMiddleware:
    """Set request_id on the request and in log context for the request lifecycle."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = getattr(request, "request_id", None) or uuid.uuid4().hex
        request.request_id = request_id
        set_request_id(request_id)
        return self.get_response(request)


class ReverseProxyFixedIPMiddleware:
    """
    Middleware to handle rate limiting behind a reverse proxy.
    
    When running behind a reverse proxy (e.g., Nginx, Cloudflare), 
    the REMOTE_ADDR will always be the proxy's IP. This middleware
    extracts the original client IP from X-Forwarded-For header.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Get the original client IP from X-Forwarded-For header
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            # X-Forwarded-For may contain multiple IPs, take the first one (original client)
            client_ip = x_forwarded_for.split(",")[0].strip()
            request.META["REMOTE_ADDR"] = client_ip
        
        return self.get_response(request)
