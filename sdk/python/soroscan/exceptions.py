"""Exception classes for SoroScan SDK."""


class SoroScanError(Exception):
    """Base exception for all SoroScan SDK errors."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class SoroScanAPIError(SoroScanError):
    """Raised when the API returns an error response."""

    def __init__(
        self,
        message: str,
        status_code: int,
        code: str | None = None,
        response_data: dict[str, object] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code or "unknown_error"
        self.response_data = response_data or {}


class SoroScanAuthError(SoroScanAPIError):
    """Raised when authentication fails (401/403)."""

    pass


class SoroScanNotFoundError(SoroScanAPIError):
    """Raised when a resource is not found (404)."""

    def __init__(
        self,
        message: str,
        status_code: int = 404,
        code: str | None = None,
        response_data: dict[str, object] | None = None,
        resource_type: str | None = None,
        resource_id: str | None = None,
    ) -> None:
        super().__init__(message, status_code, code, response_data)
        self.resource_type = resource_type
        self.resource_id = resource_id


class SoroScanRateLimitError(SoroScanAPIError):
    """Raised when rate limit is exceeded (429)."""

    def __init__(
        self,
        message: str,
        status_code: int = 429,
        code: str | None = None,
        response_data: dict[str, object] | None = None,
        retry_after: int | None = None,
        limit: int | None = None,
        remaining: int | None = None,
    ) -> None:
        super().__init__(message, status_code, code, response_data)
        self.retry_after = retry_after
        self.limit = limit
        self.remaining = remaining


class SoroScanValidationError(SoroScanAPIError):
    """Raised when request validation fails (400)."""

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        code: str | None = None,
        response_data: dict[str, object] | None = None,
        field: str | None = None,
        value: object | None = None,
        errors: list[dict[str, object]] | None = None,
    ) -> None:
        super().__init__(message, status_code, code, response_data)
        self.field = field
        self.value = value
        self.errors = errors or []


class SoroScanNetworkError(SoroScanError):
    """Raised when a network error occurs (timeout, connection refused, etc)."""

    def __init__(
        self,
        message: str,
        url: str | None = None,
        timeout: float | None = None,
    ) -> None:
        super().__init__(message)
        self.url = url
        self.timeout = timeout


class SoroScanTimeoutError(SoroScanNetworkError):
    """Raised when a request times out."""

    def __init__(
        self,
        message: str,
        url: str | None = None,
        timeout: float | None = None,
    ) -> None:
        super().__init__(message, url, timeout)


class SoroScanConnectionError(SoroScanNetworkError):
    """Raised when a connection cannot be established."""

    def __init__(
        self,
        message: str,
        url: str | None = None,
    ) -> None:
        super().__init__(message, url, None)


class SoroScanServerError(SoroScanAPIError):
    """Raised when the server returns a 5xx error."""

    pass
