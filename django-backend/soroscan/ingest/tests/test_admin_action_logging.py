"""Tests for TrackedContract signal-based admin action logging (issue #214)."""
import pytest
from django.contrib.auth import get_user_model

from soroscan.ingest.models import AdminAction, TrackedContract
from soroscan.ingest.tests.factories import TrackedContractFactory, UserFactory

User = get_user_model()


@pytest.mark.django_db
class TestAdminActionSignals:
    def test_create_logs_action(self):
        """Creating a TrackedContract produces an AdminAction with action='create'."""
        before = AdminAction.objects.count()
        contract = TrackedContractFactory()
        after = AdminAction.objects.count()
        assert after == before + 1
        log = AdminAction.objects.filter(
            action="create", object_type="trackedcontract", object_id=str(contract.pk)
        ).first()
        assert log is not None
        assert log.changes["contract_id"] == contract.contract_id

    def test_update_logs_action(self):
        """Updating a TrackedContract produces an AdminAction with action='update'."""
        contract = TrackedContractFactory(name="Before")
        before = AdminAction.objects.count()
        contract.name = "After"
        contract.save()
        after = AdminAction.objects.count()
        assert after == before + 1
        log = AdminAction.objects.filter(
            action="update", object_type="trackedcontract", object_id=str(contract.pk)
        ).latest("timestamp")
        assert log is not None
        assert "name" in log.changes or "contract_id" in log.changes

    def test_delete_logs_action(self):
        """Deleting a TrackedContract produces an AdminAction with action='delete'."""
        contract = TrackedContractFactory()
        pk = contract.pk
        contract_id = contract.contract_id
        before = AdminAction.objects.count()
        contract.delete()
        after = AdminAction.objects.count()
        assert after == before + 1
        log = AdminAction.objects.filter(
            action="delete", object_type="trackedcontract", object_id=str(pk)
        ).first()
        assert log is not None
        assert log.changes["contract_id"] == contract_id

    def test_admin_action_is_immutable(self):
        """AdminAction records cannot be updated or deleted."""
        from django.core.exceptions import ValidationError
        contract = TrackedContractFactory()
        log = AdminAction.objects.filter(object_type="trackedcontract").first()
        assert log is not None
        with pytest.raises(ValidationError):
            log.action = "tampered"
            log.save()

    def test_multiple_updates_each_logged(self):
        """Each save produces its own AdminAction log entry."""
        contract = TrackedContractFactory(name="v1")
        before = AdminAction.objects.count()
        contract.name = "v2"
        contract.save()
        contract.name = "v3"
        contract.save()
        assert AdminAction.objects.count() == before + 2
