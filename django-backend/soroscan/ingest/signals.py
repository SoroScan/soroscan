from corsheaders.signals import check_request_enabled
from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
import logging

from .cache_utils import invalidate_cached_contract
from .models import Organization, TrackedContract


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


@receiver([post_save, post_delete], sender=TrackedContract)
def invalidate_contract_on_update(sender, instance, **kwargs):
    """Invalidate the Redis cache for a TrackedContract when it is modified or deleted."""
    if instance.contract_id:
        invalidate_cached_contract(instance.contract_id)


@receiver(check_request_enabled)
def cors_allow_organization_origins(sender, request, **kwargs):
    origin = request.headers.get("Origin")
    if not origin:
        return None
    
    # First check if any organization has this origin
    for org in Organization.objects.all():
        if origin in (org.cors_origins or []):
            return True
    
    # Also check if request is for a specific contract that belongs to an org with this origin
    if hasattr(request, 'resolver_match') and request.resolver_match:
        kwargs = request.resolver_match.kwargs
        if 'contract_id' in kwargs:
            try:
                contract = TrackedContract.objects.get(contract_id=kwargs['contract_id'])
                if contract.organization and origin in (contract.organization.cors_origins or []):
                    return True
            except TrackedContract.DoesNotExist:
                pass
    
    return None
