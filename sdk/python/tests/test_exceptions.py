"""Tests for SoroScan SDK exception hierarchy."""

import pytest

from soroscan.exceptions import (
    SoroScanError,
    SoroScanAPIError,
    SoroScanAuthError,
    SoroScanNotFoundError,
    SoroScanRateLimitError,
    SoroScanValidationError,
    SoroScanNetworkError,
    SoroScanTimeoutError,
    SoroScanConnectionError,
    SoroScanServerError,
)


class TestSoroScanError:
    def test_base_error_with_message(self):
        error = SoroScanError("Test error")
        assert error.message == "Test error"
        assert str(error) == "Test error"


class TestSoroScanAPIError:
    def test_api_error_with_status_code_and_code(self):
        error = SoroScanAPIError("Invalid input", 400, "validation_error")
        assert error.message == "Invalid input"
        assert error.status_code == 400
        assert error.code == "validation_error"
        assert error.response_data == {}

    def test_api_error_with_response_data(self):
        details = {"field": "amount", "value": "invalid"}
        error = SoroScanAPIError("Invalid input", 400, "validation_error", details)
        assert error.response_data == details

    def test_api_error_defaults_code_to_unknown(self):
        error = SoroScanAPIError("Server error", 500)
        assert error.code == "unknown_error"


class TestSoroScanAuthError:
    def test_auth_error(self):
        error = SoroScanAuthError("Invalid API key", 401, "unauthorized")
        assert error.message == "Invalid API key"
        assert error.status_code == 401
        assert error.code == "unauthorized"
        assert isinstance(error, SoroScanAPIError)


class TestSoroScanNotFoundError:
    def test_not_found_error_with_resource_info(self):
        error = SoroScanNotFoundError(
            "Contract not found",
            404,
            "not_found",
            resource_type="contract",
            resource_id="CCAAA...",
        )
        assert error.message == "Contract not found"
        assert error.status_code == 404
        assert error.resource_type == "contract"
        assert error.resource_id == "CCAAA..."

    def test_not_found_error_without_resource_info(self):
        error = SoroScanNotFoundError("Not found", 404, "not_found")
        assert error.resource_type is None
        assert error.resource_id is None


class TestSoroScanRateLimitError:
    def test_rate_limit_error_with_limit_info(self):
        error = SoroScanRateLimitError(
            "Too many requests",
            429,
            "rate_limit_exceeded",
            retry_after=60,
            limit=1000,
            remaining=500,
        )
        assert error.message == "Too many requests"
        assert error.status_code == 429
        assert error.retry_after == 60
        assert error.limit == 1000
        assert error.remaining == 500

    def test_rate_limit_error_without_limit_info(self):
        error = SoroScanRateLimitError("Too many requests", 429, "rate_limit_exceeded")
        assert error.retry_after is None
        assert error.limit is None
        assert error.remaining is None


class TestSoroScanValidationError:
    def test_validation_error_with_field_info(self):
        errors = [{"field": "amount", "message": "Must be positive"}]
        error = SoroScanValidationError(
            "Invalid input",
            400,
            "validation_error",
            field="amount",
            value=-1,
            errors=errors,
        )
        assert error.message == "Invalid input"
        assert error.status_code == 400
        assert error.field == "amount"
        assert error.value == -1
        assert error.errors == errors

    def test_validation_error_defaults_errors_to_empty_list(self):
        error = SoroScanValidationError("Invalid input", 400, "validation_error")
        assert error.errors == []


class TestSoroScanNetworkError:
    def test_network_error_with_url_and_timeout(self):
        error = SoroScanNetworkError("Network error", url="https://api.example.com", timeout=5.0)
        assert error.message == "Network error"
        assert error.url == "https://api.example.com"
        assert error.timeout == 5.0

    def test_network_error_without_url_and_timeout(self):
        error = SoroScanNetworkError("Network error")
        assert error.url is None
        assert error.timeout is None


class TestSoroScanTimeoutError:
    def test_timeout_error(self):
        error = SoroScanTimeoutError("Request timed out", url="https://api.example.com", timeout=5.0)
        assert error.message == "Request timed out"
        assert error.url == "https://api.example.com"
        assert error.timeout == 5.0
        assert isinstance(error, SoroScanNetworkError)


class TestSoroScanConnectionError:
    def test_connection_error(self):
        error = SoroScanConnectionError("Connection failed", url="https://api.example.com")
        assert error.message == "Connection failed"
        assert error.url == "https://api.example.com"
        assert error.timeout is None
        assert isinstance(error, SoroScanNetworkError)


class TestSoroScanServerError:
    def test_server_error(self):
        error = SoroScanServerError("Internal server error", 500, "internal_error")
        assert error.message == "Internal server error"
        assert error.status_code == 500
        assert error.code == "internal_error"
        assert isinstance(error, SoroScanAPIError)


class TestErrorInheritance:
    def test_specific_errors_inherit_from_base(self):
        rate_limit_error = SoroScanRateLimitError("Too many requests", 429, "rate_limit_exceeded")
        assert isinstance(rate_limit_error, SoroScanError)
        assert isinstance(rate_limit_error, SoroScanAPIError)
        assert isinstance(rate_limit_error, SoroScanRateLimitError)
        assert not isinstance(rate_limit_error, SoroScanAuthError)

    def test_network_errors_inherit_from_base(self):
        timeout_error = SoroScanTimeoutError("Timeout", url="https://api.example.com", timeout=5.0)
        assert isinstance(timeout_error, SoroScanError)
        assert isinstance(timeout_error, SoroScanNetworkError)
        assert isinstance(timeout_error, SoroScanTimeoutError)
        assert not isinstance(timeout_error, SoroScanConnectionError)
