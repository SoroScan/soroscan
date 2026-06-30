"""Tests for Django admin audit trail (AdminAction model + AdminAuditMixin)."""

import pytest
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import RequestFactory

from soroscan.ingest.admin import AdminActionAdmin, TrackedContractAdmin
from soroscan.ingest.models import AdminAction, TrackedContract
from soroscan.ingest.tests.factories import TrackedContractFactory, UserFactory

User = get_user_model()


@pytest.mark.django_db
class TestAdminAuditMixin:
    def setup_method(self):
        self.site = AdminSite()
        self.admin = TrackedContractAdmin(TrackedContract, self.site)
        self.factory = RequestFactory()
        self.staff = UserFactory(is_staff=True, is_superuser=True)

    def _request(self, method="POST", path="/admin/"):
        request = getattr(self.factory, method.lower())(path)
        request.user = self.staff
        request.META["REMOTE_ADDR"] = "203.0.113.10"
        return request

    def test_log_addition_creates_admin_action(self):
        contract = TrackedContractFactory()
        request = self._request()

        self.admin.log_addition(request, contract, [{"changed": {"fields": ["name"]}}])

        entry = AdminAction.objects.get(action="add", object_id=str(contract.pk))
        assert entry.user == self.staff
        assert entry.object_type == "trackedcontract"
        assert entry.ip_address == "203.0.113.10"
        assert entry.changes["message"][0]["changed"]["fields"] == ["name"]

    def test_log_change_creates_admin_action(self):
        contract = TrackedContractFactory()
        request = self._request()

        self.admin.log_change(request, contract, [{"changed": {"fields": ["is_active"]}}])

        entry = AdminAction.objects.get(action="change", object_id=str(contract.pk))
        assert entry.user == self.staff
        assert entry.action == "change"

    def test_log_deletions_creates_admin_action(self):
        contract = TrackedContractFactory()
        request = self._request()
        queryset = TrackedContract.objects.filter(pk=contract.pk)

        self.admin.log_deletions(request, queryset)

        entry = AdminAction.objects.get(action="delete", object_id=str(contract.pk))
        assert entry.user == self.staff
        assert entry.changes["message"] == "Deleted via Django admin"


@pytest.mark.django_db
class TestAdminActionAdmin:
    def setup_method(self):
        self.site = AdminSite()
        self.admin = AdminActionAdmin(AdminAction, self.site)
        self.staff = UserFactory(is_staff=True, is_superuser=True)

    def test_admin_action_is_read_only(self):
        request = RequestFactory().get("/admin/")
        request.user = self.staff

        assert self.admin.has_add_permission(request) is False
        assert self.admin.has_change_permission(request) is False
        assert self.admin.has_delete_permission(request) is False

    def test_admin_action_records_are_immutable(self):
        user = UserFactory()
        entry = AdminAction.objects.create(
            user=user,
            action="change",
            object_type="trackedcontract",
            object_id="1",
            ip_address="127.0.0.1",
            changes={"field": "name"},
        )

        entry.action = "delete"
        with pytest.raises(ValidationError):
            entry.save()

        with pytest.raises(ValidationError):
            entry.delete()
