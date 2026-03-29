"""
Signal handlers for logging TrackedContract admin actions (issue #214).

Captures create/update/delete events on TrackedContract and writes
immutable AdminAction records for audit purposes.
"""
import threading

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import AdminAction, TrackedContract

# Thread-local storage to hold pre-save field snapshots keyed by instance pk.
_pre_save_state: dict = {}
_state_lock = threading.Lock()


def _snapshot(instance) -> dict:
    """Return a plain-dict snapshot of all concrete field values."""
    return {
        field.attname: getattr(instance, field.attname)
        for field in instance._meta.concrete_fields
    }


@receiver(pre_save, sender=TrackedContract)
def _capture_pre_save(sender, instance, **kwargs) -> None:
    """Store a snapshot of the current DB state before an update."""
    if instance.pk is None:
        return  # new object – nothing to diff
    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    with _state_lock:
        _pre_save_state[instance.pk] = _snapshot(old)


@receiver(post_save, sender=TrackedContract)
def _log_contract_save(sender, instance, created: bool, **kwargs) -> None:
    """Create an AdminAction record after a TrackedContract save."""
    if created:
        changes = {
            "contract_id": instance.contract_id,
            "name": instance.name,
        }
        action = "create"
    else:
        with _state_lock:
            old_state = _pre_save_state.pop(instance.pk, {})
        new_state = _snapshot(instance)
        diff = {
            k: {"old": str(old_state[k]), "new": str(new_state[k])}
            for k in new_state
            if k in old_state and old_state[k] != new_state[k]
        }
        changes = diff if diff else {"contract_id": instance.contract_id}
        action = "update"

    try:
        AdminAction.objects.create(
            user=None,
            action=action,
            object_type="trackedcontract",
            object_id=str(instance.pk),
            changes=changes,
        )
    except Exception:
        pass  # audit failures must never break contract saves


@receiver(post_delete, sender=TrackedContract)
def _log_contract_delete(sender, instance, **kwargs) -> None:
    """Create an AdminAction record after a TrackedContract deletion."""
    try:
        AdminAction.objects.create(
            user=None,
            action="delete",
            object_type="trackedcontract",
            object_id=str(instance.pk),
            changes={
                "contract_id": instance.contract_id,
                "name": instance.name,
            },
        )
    except Exception:
        pass
