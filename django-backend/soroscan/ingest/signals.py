from corsheaders.signals import check_request_enabled
from django.dispatch import receiver

from .models import Organization, TrackedContract


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
