"""
Webhook signature verification utilities for the SoroScan Python SDK.

Provides helpers to verify HMAC signatures on incoming webhooks.
"""

import hashlib
import hmac
from typing import Dict, Optional, Union


def verify_webhook_signature(
    payload: Union[str, bytes],
    signature_header_value: Optional[str],
    secret_key: str,
    known_algorithms: tuple = ("sha256", "sha1"),
) -> bool:
    """
    Verify the X-SoroScan-Signature header of an incoming webhook.

    Args:
        payload: The raw webhook body (string or bytes).
        signature_header_value:
            The value of the ``X-SoroScan-Signature`` header
            (e.g. ``"sha256=abc123..."``).  If ``None`` verification fails.
        secret_key: The shared HMAC signing key (hex-encoded string).
        known_algorithms:
            Acceptable hash prefixes.  Defaults to ``("sha256", "sha1")``.

    Returns:
        ``True`` if the signature is valid, ``False`` otherwise.

    Usage::

        from soroscan.webhooks import verify_webhook_signature

        is_valid = verify_webhook_signature(
            payload=request.body,
            signature_header_value=request.headers.get("X-SoroScan-Signature"),
            secret_key="<your-signing-key>",
        )
        if not is_valid:
            raise PermissionError("Invalid webhook signature")
    """
    if not signature_header_value:
        return False

    try:
        if "=" not in signature_header_value:
            return False

        algorithm, signature = signature_header_value.split("=", 1)
        if algorithm not in known_algorithms:
            return False

        if isinstance(payload, bytes):
            payload_str = payload.decode("utf-8")
        else:
            payload_str = payload

        digestmod = hashlib.sha256 if algorithm == "sha256" else hashlib.sha1
        expected = hmac.new(
            secret_key.encode("utf-8"),
            payload_str.encode("utf-8"),
            digestmod=digestmod,
        ).hexdigest()

        return hmac.compare_digest(expected, signature)
    except (ValueError, AttributeError, TypeError):
        return False


def verify_webhook(
    payload: Union[str, bytes],
    headers: Dict[str, str],
    secret_key: str,
) -> bool:
    """
    Convenience wrapper that extracts the signature header from a
    headers dict.

    Args:
        payload: The raw webhook body (string or bytes).
        headers: A dict-like object of request headers (case-insensitive
                 keys recommended).
        secret_key: The shared HMAC signing key.

    Returns:
        ``True`` if the signature is valid, ``False`` otherwise.
    """
    header_value = None
    for key, value in headers.items():
        if key.lower() == "x-soroscan-signature":
            header_value = value
            break
    return verify_webhook_signature(payload, header_value, secret_key)


__all__ = [
    "verify_webhook_signature",
    "verify_webhook",
]
