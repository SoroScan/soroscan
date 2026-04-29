"""
Security audit signals — logs successful and failed admin login attempts.
Hooks into Django's user_logged_in and user_login_failed signals.
"""
import logging

from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.dispatch import receiver

logger = logging.getLogger("soroscan.security_audit")


def _get_client_ip(request) -> str:
    """Extract the real client IP, respecting X-Forwarded-For if present."""
    if request is None:
        return "unknown"
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


@receiver(user_logged_in)
def on_user_logged_in(sender, request, user, **kwargs):
    ip = _get_client_ip(request)
    logger.info(
        "LOGIN_SUCCESS username=%s ip=%s",
        getattr(user, "username", str(user)),
        ip,
    )


@receiver(user_login_failed)
def on_user_login_failed(sender, credentials, request, **kwargs):
    ip = _get_client_ip(request)
    username = credentials.get("username", "unknown")
    logger.warning(
        "LOGIN_FAILED username=%s ip=%s",
        username,
        ip,
    )
