"""
Middleware for request-scoped log context (request_id) and slow query logging.
"""
import json
import logging
import time
import uuid

from django.conf import settings
from django.db import connection
from django.http import JsonResponse

from .log_context import set_request_id

logger = logging.getLogger(__name__)
slow_query_logger = logging.getLogger("soroscan.slow_queries")


class RequestIdMiddleware:
    """Set request_id on the request and in log context for the request lifecycle."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.META.get("HTTP_X_REQUEST_ID") or getattr(request, "request_id", None) or uuid.uuid4().hex
        request.request_id = request_id
        set_request_id(request_id)
        
        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        
        if response.status_code >= 400 and response.get("Content-Type", "").startswith("application/json"):
            if not getattr(response, "streaming", False):
                try:
                    data = json.loads(response.content)
                    if isinstance(data, dict):
                        data["request_id"] = request_id
                        new_content = json.dumps(data).encode("utf-8")
                        response.content = new_content
                        if "Content-Length" in response:
                            response["Content-Length"] = str(len(new_content))
                except (json.JSONDecodeError, AttributeError):
                    pass
                    
        return response


class PlatformVersionMiddleware:
    """Attach platform version metadata to every response."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response["X-SoroScan-Version"] = getattr(settings, "SOFTWARE_VERSION", "unknown")
        return response


class APIUsageAnalyticsMiddleware:
    """Persist API request usage facts for organization analytics."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.path.startswith(("/api/", "/graphql/")):
            self._record_usage(request, response)

        return response

    def _record_usage(self, request, response) -> None:
        try:
            from soroscan.ingest.models import APIKey, APIUsageLog, OrganizationMembership

            api_key = self._get_api_key(request, APIKey)
            user = getattr(request, "user", None)
            if not getattr(user, "is_authenticated", False):
                user = getattr(api_key, "user", None)

            organization = None
            if api_key and api_key.team_id:
                organization = getattr(api_key.team, "organization", None)
            if organization is None and user is not None:
                membership = (
                    OrganizationMembership.objects.select_related("organization")
                    .filter(user=user)
                    .order_by("organization_id")
                    .first()
                )
                organization = membership.organization if membership else None

            APIUsageLog.objects.create(
                organization=organization,
                user=user,
                api_key=api_key,
                method=request.method,
                endpoint=self._endpoint_name(request),
                path=request.path[:512],
                status_code=getattr(response, "status_code", 0) or 0,
                request_bytes=self._request_bytes(request),
                response_bytes=self._response_bytes(response),
                error_type=self._error_type(response),
            )
        except Exception:
            logger.exception("Failed to record API usage analytics")

    @staticmethod
    def _get_api_key(request, api_key_model):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        key = ""
        if auth.lower().startswith("apikey "):
            key = auth[7:].strip()
        if not key:
            key = request.GET.get("api_key", "")
        if not key:
            return None
        return (
            api_key_model.objects.select_related("user", "team", "team__organization")
            .filter(key=key, is_active=True)
            .first()
        )

    @staticmethod
    def _endpoint_name(request) -> str:
        match = getattr(request, "resolver_match", None)
        if match:
            route = getattr(match, "route", "")
            if route:
                return route[:255]
            if match.view_name:
                return match.view_name[:255]
        return request.path[:255]

    @staticmethod
    def _request_bytes(request) -> int:
        try:
            return max(0, int(request.META.get("CONTENT_LENGTH") or 0))
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _response_bytes(response) -> int:
        try:
            return max(0, int(response.get("Content-Length") or 0))
        except (TypeError, ValueError):
            pass
        if getattr(response, "streaming", False):
            return 0
        content = getattr(response, "content", b"")
        return len(content or b"")

    @staticmethod
    def _error_type(response) -> str:
        status_code = getattr(response, "status_code", 0) or 0
        if status_code < 400:
            return ""
        if status_code >= 500:
            return f"server_error_{status_code}"
        return f"client_error_{status_code}"


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
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            client_ip = x_forwarded_for.split(",")[0].strip()
            request.META["REMOTE_ADDR"] = client_ip
        return self.get_response(request)


class SlowQueryMiddleware:
    """
    Wrap every DB execute call to log queries that exceed
    LOGGING_SLOW_QUERIES_THRESHOLD_MS (default 100 ms) to the
    ``soroscan.slow_queries`` logger, which writes to a daily-rotated file.

    Overhead is negligible (<1 µs per query for the monotonic clock call)
    and the wrapper is only active when the logger is configured.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.threshold_ms: int = getattr(settings, "LOGGING_SLOW_QUERIES_THRESHOLD_MS", 100)

    def __call__(self, request):
        threshold = self.threshold_ms

        def _execute(execute, sql, params, many, context):
            start = time.monotonic()
            try:
                return execute(sql, params, many, context)
            finally:
                duration_ms = (time.monotonic() - start) * 1000
                if duration_ms >= threshold:
                    # Convert params to a serializable format or stringify it to avoid log formatting errors
                    safe_params = str(params)[:1000] if params else ""
                    slow_query_logger.warning(
                        "Slow query (%dms): %s\nParams: %s",
                        int(duration_ms),
                        (sql or "")[:1000],
                        safe_params,
                        extra={
                            "duration_ms": round(duration_ms, 2),
                            "sql": (sql or "")[:1000],
                            "params": safe_params,
                            "request_path": request.path,
                        },
                    )

        with connection.execute_wrapper(_execute):
            response = self.get_response(request)

        # Forward RateLimit-* headers set by APIKeyThrottle
        headers = getattr(request, "_api_key_throttle_headers", None)
        if headers and hasattr(response, "__setitem__"):
            for name, value in headers.items():
                response[name] = value

        return response

class RequestBodySizeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # We check this at the very beginning of the __call__
        if request.method == "POST":
            max_size = getattr(settings, "MAX_REQUEST_BODY_SIZE", 10485760)
            try:
                content_length = int(request.META.get('CONTENT_LENGTH', 0))
                if content_length > max_size:
                    logger.warning("Payload Too Large: %s bytes", content_length)
                    return JsonResponse(
                        {"error": "Payload Too Large", "limit": max_size},
                        status=413
                    )
            except (ValueError, TypeError):
                pass
        
        return self.get_response(request)
        
class GracefulShutdownMiddleware:
    """Reject new requests during shutdown and track in-flight request count."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from soroscan.shutdown import end_request, try_begin_request

        if not try_begin_request():
            return JsonResponse(
                {"error": "Server is shutting down"},
                status=503,
            )
        try:
            return self.get_response(request)
        finally:
            end_request()


class MaintenanceModeMiddleware:
    """Return 503 for all non-admin routes when MAINTENANCE_MODE=True."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if getattr(settings, "MAINTENANCE_MODE", False) and not request.path.startswith("/admin"):
            return JsonResponse(
                {"error": "Service temporarily unavailable. Please try again later."},
                status=503,
            )
        return self.get_response(request)


class ApiDeprecationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        deprecated_endpoints = getattr(settings, "DEPRECATED_ENDPOINTS", {})

        # Normalize request path: remove leading/trailing slashes
        norm_request_path = request.path.strip("/")

        for path, config in deprecated_endpoints.items():
            # Normalize config path
            if path.strip("/") == norm_request_path:
                response["Deprecation"] = "true"
                response["Sunset"] = config.get("sunset", "")
                response["Link"] = f'<{config.get("replacement", "")}>; rel="replacement"'
                break
        return response
