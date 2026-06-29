"""
HMAC-SHA256 request signing and verification for webhook security.

Provides outbound webhook signing (X-SoroScan-Signature header) and
verification utilities for webhook subscribers.
"""

import hashlib
import hmac
import secrets
from typing import Optional


def generate_signing_key() -> str:
    """
    Generate a cryptographically secure signing key.

    Returns a hex-encoded string of 32 random bytes (64 hex chars).
    """
    return secrets.token_hex(32)


def sign_webhook_payload(payload: str, key: str, algorithm: str = "sha256") -> str:
    """
    Sign a webhook payload using HMAC.

    Args:
        payload: The JSON-serialized payload string to sign.
        key: The signing key (hex-encoded string).
        algorithm: Hash algorithm to use ("sha256" or "sha1").

    Returns:
        Signature string in the format "{algorithm}={hex_digest}".

    Example:
        >>> sign_webhook_payload('{"event":"transfer"}', my_key)
        'sha256=abc123def456...'
    """
    digestmod = hashlib.sha256 if algorithm == "sha256" else hashlib.sha1
    prefix = "sha256" if algorithm == "sha256" else "sha1"
    sig_hex = hmac.new(
        key.encode("utf-8"),
        payload.encode("utf-8"),
        digestmod=digestmod,
    ).hexdigest()
    return f"{prefix}={sig_hex}"


def verify_webhook_signature(
    payload: str, signature_header: str, secret_key: str
) -> bool:
    """
    Verify a webhook payload against the X-SoroScan-Signature header.

    Args:
        payload: The raw JSON payload string.
        signature_header: The X-SoroScan-Signature header value
                         (e.g. "sha256=abc123...").
        secret_key: The shared signing key.

    Returns:
        True if the signature is valid, False otherwise.

    Example:
        >>> is_valid = verify_webhook_signature(
        ...     '{"event":"transfer"}',
        ...     'sha256=abc123...',
        ...     my_key
        ... )
    """
    if not signature_header:
        return False
    try:
        if "=" not in signature_header:
            return False
        algorithm_part, signature = signature_header.split("=", 1)
        digestmod = (
            hashlib.sha256 if algorithm_part == "sha256" else hashlib.sha1
        )
        expected_sig = hmac.new(
            secret_key.encode("utf-8"),
            payload.encode("utf-8"),
            digestmod=digestmod,
        ).hexdigest()
        return hmac.compare_digest(expected_sig, signature)
    except (ValueError, AttributeError):
        return False


def verify_webhook_request(
    payload: bytes,
    signature_header: Optional[str],
    secret_key: str,
) -> bool:
    """
    Verify a webhook request from raw bytes payload and headers.

    Convenience wrapper that decodes bytes and delegates to
    verify_webhook_signature.

    Args:
        payload: Raw bytes of the request body.
        signature_header: The X-SoroScan-Signature header value or None.
        secret_key: The shared signing key.

    Returns:
        True if the signature is valid, False otherwise.
    """
    if not signature_header:
        return False
    payload_str = payload.decode("utf-8") if isinstance(payload, bytes) else payload
    return verify_webhook_signature(payload_str, signature_header, secret_key)
