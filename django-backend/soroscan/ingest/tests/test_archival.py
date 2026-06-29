"""Integration tests for data retention, archival, and restoration."""

import json
import gzip
from datetime import timedelta
from unittest.mock import patch, MagicMock

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from soroscan.ingest.tests.factories import ContractEventFactory, TrackedContractFactory, UserFactory

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def contract(user):
    return TrackedContractFactory(owner=user)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def policy(contract):
    from soroscan.ingest.models import DataRetentionPolicy

    return DataRetentionPolicy.objects.create(
        contract=contract,
        retention_days=30,
        archive_enabled=True,
        s3_bucket="test-archive-bucket",
        s3_prefix="soroscan/archives/",
    )


def _make_old_event(contract, **overrides):
    """Create a ContractEvent older than 30 days."""
    defaults = dict(
        contract=contract,
        timestamp=timezone.now() - timedelta(days=60),
    )
    defaults.update(overrides)
    return ContractEventFactory(**defaults)


def _make_recent_event(contract, **overrides):
    """Create a ContractEvent newer than 30 days."""
    defaults = dict(
        contract=contract,
        timestamp=timezone.now() - timedelta(days=5),
    )
    defaults.update(overrides)
    return ContractEventFactory(**defaults)


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestDataRetentionPolicyModel:
    def test_create_global_policy(self):
        from soroscan.ingest.models import DataRetentionPolicy

        p = DataRetentionPolicy.objects.create(
            contract=None,
            retention_days=180,
            s3_bucket="global-bucket",
        )
        assert p.archive_enabled is True
        assert str(p).startswith("RetentionPolicy(Global")

    def test_create_contract_policy(self, contract):
        from soroscan.ingest.models import DataRetentionPolicy

        p = DataRetentionPolicy.objects.create(
            contract=contract,
            retention_days=90,
            s3_bucket="contract-bucket",
        )
        assert "active" in str(p) or "RetentionPolicy" in str(p)

    def test_one_to_one_constraint(self, contract):
        from soroscan.ingest.models import DataRetentionPolicy

        DataRetentionPolicy.objects.create(
            contract=contract, retention_days=30, s3_bucket="b"
        )
        with pytest.raises(Exception):
            DataRetentionPolicy.objects.create(
                contract=contract, retention_days=60, s3_bucket="b"
            )


@pytest.mark.django_db
class TestArchivedEventBatchModel:
    def test_create_batch(self, policy):
        from soroscan.ingest.models import ArchivedEventBatch

        batch = ArchivedEventBatch.objects.create(
            policy=policy,
            s3_key="soroscan/archives/test/batch_1.json.gz",
            event_count=100,
            size_bytes=4096,
            min_timestamp=timezone.now() - timedelta(days=60),
            max_timestamp=timezone.now() - timedelta(days=31),
        )
        assert batch.status == ArchivedEventBatch.STATUS_ARCHIVED
        assert str(batch).startswith("Batch(")


@pytest.mark.django_db
class TestArchivalAuditLogModel:
    def test_create_audit_log(self, policy):
        from soroscan.ingest.models import ArchivalAuditLog

        log = ArchivalAuditLog.objects.create(
            action=ArchivalAuditLog.ACTION_ARCHIVE,
            policy=policy,
            event_count=50,
            detail="Test archive",
        )
        assert str(log).startswith("AuditLog(")


# ---------------------------------------------------------------------------
# archive_old_events task — full integration with mocked S3
# ---------------------------------------------------------------------------

def _mock_s3_client(contract_id=None):
    """Return a MagicMock configured to act as a boto3 S3 client."""
    cid = contract_id or "CTEST"
    client = MagicMock()
    client.put_object.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}
    client.get_object.return_value = {
        "Body": MagicMock(read=MagicMock(return_value=gzip.compress(json.dumps([{
            "contract__contract_id": cid,
            "event_type": "swap",
            "payload": {"amount": 100},
            "payload_hash": "a" * 64,
            "ledger": 5000,
            "event_index": 0,
            "timestamp": "2024-01-01T00:00:00Z",
            "tx_hash": "b" * 64,
        }]).encode("utf-8"))))
    }
    return client


@pytest.mark.django_db
class TestArchiveOldEventsIntegration:
    def test_archives_old_events_and_deletes_from_pg(self, contract, policy):
        from soroscan.ingest.tasks import archive_old_events

        old = _make_old_event(contract)
        _make_recent_event(contract)

        with patch("boto3.client", return_value=_mock_s3_client()):
            result = archive_old_events()

        assert result["archived"] >= 1
        assert result["deleted"] >= 1
        assert result["errors"] == []

        from soroscan.ingest.models import ContractEvent

        assert not ContractEvent.objects.filter(pk=old.pk).exists()

    def test_preserves_recent_events(self, contract, policy):
        from soroscan.ingest.tasks import archive_old_events

        recent = _make_recent_event(contract)

        with patch("boto3.client", return_value=_mock_s3_client()):
            result = archive_old_events()

        assert result["archived"] == 0
        assert result["deleted"] == 0

        from soroscan.ingest.models import ContractEvent

        assert ContractEvent.objects.filter(pk=recent.pk).exists()

    def test_creates_archived_event_batch_record(self, contract, policy):
        from soroscan.ingest.tasks import archive_old_events
        from soroscan.ingest.models import ArchivedEventBatch

        _make_old_event(contract)

        with patch("boto3.client", return_value=_mock_s3_client()):
            archive_old_events()

        assert ArchivedEventBatch.objects.filter(policy=policy).count() >= 1

    def test_creates_audit_log_entry(self, contract, policy):
        from soroscan.ingest.tasks import archive_old_events
        from soroscan.ingest.models import ArchivalAuditLog

        _make_old_event(contract)

        with patch("boto3.client", return_value=_mock_s3_client()):
            archive_old_events()

        assert ArchivalAuditLog.objects.filter(
            action=ArchivalAuditLog.ACTION_ARCHIVE,
        ).count() >= 1

    def test_disabled_policy_skips_archival(self, contract):
        from soroscan.ingest.tasks import archive_old_events
        from soroscan.ingest.models import DataRetentionPolicy

        DataRetentionPolicy.objects.create(
            contract=contract,
            retention_days=30,
            archive_enabled=False,
            s3_bucket="test-bucket",
        )
        _make_old_event(contract)

        with patch("boto3.client", return_value=_mock_s3_client()):
            result = archive_old_events()

        assert result["archived"] == 0
        assert result["deleted"] == 0

    def test_no_policy_does_nothing(self, contract):
        from soroscan.ingest.tasks import archive_old_events

        _make_old_event(contract)

        result = archive_old_events()
        assert result["archived"] == 0
        assert result["deleted"] == 0

    def test_records_compressed_size_in_batch(self, contract, policy):
        from soroscan.ingest.tasks import archive_old_events
        from soroscan.ingest.models import ArchivedEventBatch

        _make_old_event(contract)

        with patch("boto3.client", return_value=_mock_s3_client()):
            archive_old_events()

        batch = ArchivedEventBatch.objects.filter(policy=policy).first()
        assert batch is not None
        assert batch.size_bytes > 0

    def test_global_policy_archives_all_contracts(self):
        from soroscan.ingest.tasks import archive_old_events
        from soroscan.ingest.models import DataRetentionPolicy
        from soroscan.ingest.tests.factories import TrackedContractFactory

        # Create a global policy (contract=None)
        DataRetentionPolicy.objects.create(
            contract=None,
            retention_days=30,
            archive_enabled=True,
            s3_bucket="global-bucket",
        )
        c1 = TrackedContractFactory()
        c2 = TrackedContractFactory()
        _make_old_event(c1)
        _make_old_event(c2)

        with patch("boto3.client", return_value=_mock_s3_client()):
            result = archive_old_events()

        assert result["archived"] >= 2
        assert result["errors"] == []


# ---------------------------------------------------------------------------
# Restore archived events endpoint
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestRestoreArchivedEvents:
    def test_restore_with_valid_batch(self, auth_client, contract, policy):
        from soroscan.ingest.models import ArchivedEventBatch, ArchivalAuditLog

        # Create an archived batch record
        batch = ArchivedEventBatch.objects.create(
            policy=policy,
            s3_key="soroscan/archives/test/batch_restore.json.gz",
            event_count=1,
            size_bytes=256,
            min_timestamp=timezone.now() - timedelta(days=60),
            max_timestamp=timezone.now() - timedelta(days=60),
        )

        url = f"/api/ingest/events/restore-archive/?batch_id={batch.id}"
        with patch("boto3.client", return_value=_mock_s3_client(contract.contract_id)):
            response = auth_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "restored"
        assert data["restored_count"] >= 1
        assert data["batch_id"] == batch.id

        # Batch status should be updated
        batch.refresh_from_db()
        assert batch.status == ArchivedEventBatch.STATUS_RESTORED

        # Audit log should be created
        assert ArchivalAuditLog.objects.filter(
            action=ArchivalAuditLog.ACTION_RESTORE,
            batch=batch,
        ).exists()

    def test_restore_missing_batch_id(self, auth_client):
        url = "/api/ingest/events/restore-archive/"
        response = auth_client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "batch_id" in response.json()["detail"].lower()

    def test_restore_nonexistent_batch(self, auth_client):
        url = "/api/ingest/events/restore-archive/?batch_id=999999"
        response = auth_client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_restore_already_restored_batch(self, auth_client, contract, policy):
        from soroscan.ingest.models import ArchivedEventBatch

        batch = ArchivedEventBatch.objects.create(
            policy=policy,
            s3_key="soroscan/archives/test/already_restored.json.gz",
            event_count=5,
            size_bytes=512,
            status=ArchivedEventBatch.STATUS_RESTORED,
        )
        url = f"/api/ingest/events/restore-archive/?batch_id={batch.id}"
        response = auth_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert "already restored" in response.json()["detail"].lower()

    def test_restore_requires_authentication(self, client, contract, policy):
        from soroscan.ingest.models import ArchivedEventBatch

        batch = ArchivedEventBatch.objects.create(
            policy=policy,
            s3_key="soroscan/archives/test/noauth.json.gz",
            event_count=1,
            size_bytes=128,
        )
        url = f"/api/ingest/events/restore-archive/?batch_id={batch.id}"
        response = client.post(url)
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# enforce_retention_policies (prune-only, no S3)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestEnforceRetentionPolicies:
    def test_deletes_old_events(self, contract):
        from soroscan.ingest.tasks import enforce_retention_policies
        from soroscan.ingest.models import DataRetentionPolicy

        old = _make_old_event(contract)
        recent = _make_recent_event(contract)

        DataRetentionPolicy.objects.create(
            contract=contract,
            retention_days=30,
            archive_enabled=False,
            s3_bucket="test-bucket",
        )
        result = enforce_retention_policies()
        assert contract.contract_id in result
        assert result[contract.contract_id] >= 1

        from soroscan.ingest.models import ContractEvent

        assert not ContractEvent.objects.filter(pk=old.pk).exists()
        assert ContractEvent.objects.filter(pk=recent.pk).exists()

    def test_global_policy_applied(self, contract):
        from soroscan.ingest.tasks import enforce_retention_policies
        from soroscan.ingest.models import DataRetentionPolicy

        old = _make_old_event(contract)

        DataRetentionPolicy.objects.create(
            contract=None,
            retention_days=30,
            archive_enabled=False,
            s3_bucket="global-bucket",
        )
        result = enforce_retention_policies()
        assert contract.contract_id in result

        from soroscan.ingest.models import ContractEvent

        assert not ContractEvent.objects.filter(pk=old.pk).exists()

    def test_no_policy_skips_contract(self, contract):
        from soroscan.ingest.tasks import enforce_retention_policies

        _make_old_event(contract)
        result = enforce_retention_policies()
        assert contract.contract_id not in result


# ---------------------------------------------------------------------------
# Admin views
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestRetentionAdmin:
    def test_policy_list_view(self, admin_client, policy):
        url = "/admin/ingest/dataretentionpolicy/"
        response = admin_client.get(url)
        assert response.status_code == 200
        assert policy.s3_bucket in response.content.decode()

    def test_archived_batch_list_view(self, admin_client, policy):
        from soroscan.ingest.models import ArchivedEventBatch

        batch = ArchivedEventBatch.objects.create(
            policy=policy,
            s3_key="soroscan/archives/test/admin_batch.json.gz",
            event_count=10,
            size_bytes=2048,
        )
        url = "/admin/ingest/archivedeventbatch/"
        response = admin_client.get(url)
        assert response.status_code == 200
        assert str(batch.event_count) in response.content.decode()

    def test_audit_log_list_view(self, admin_client, policy):
        from soroscan.ingest.models import ArchivalAuditLog

        log = ArchivalAuditLog.objects.create(
            action=ArchivalAuditLog.ACTION_ARCHIVE,
            policy=policy,
            event_count=10,
            detail="Admin test",
        )
        url = "/admin/ingest/archivalauditlog/"
        response = admin_client.get(url)
        assert response.status_code == 200
        assert str(log.event_count) in response.content.decode()
