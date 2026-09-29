"""
Unit tests for WebhookDeliveryLog status transitions.

Tests verify PENDING -> SUCCESS, PENDING -> FAILED -> DEAD_LETTER transitions
and attempt counter increments.
"""
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from soroscan.ingest.models import (
    TrackedContract,
    WebhookDeliveryLog,
    WebhookSubscription,
    ContractEvent,
)

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="testuser", password="testpass123")


@pytest.fixture
def contract(user):
    return TrackedContract.objects.create(
        contract_id="C" + "A" * 55,
        name="Test Contract",
        owner=user,
    )


@pytest.fixture
def webhook_subscription(contract):
    return WebhookSubscription.objects.create(
        contract=contract,
        target_url="https://example.com/webhook",
        secret="testsecret",
        is_active=True,
    )


@pytest.fixture
def contract_event(contract):
    return ContractEvent.objects.create(
        contract=contract,
        event_type="transfer",
        payload={"amount": 100, "from": "A", "to": "B"},
        ledger=12345,
        event_index=0,
        timestamp=timezone.now(),
        tx_hash="0" * 64,
    )


@pytest.mark.django_db
class TestWebhookDeliveryLogTransitions:
    """Test WebhookDeliveryLog status transitions and attempt counter."""

    def test_create_pending_log(self, webhook_subscription, contract_event):
        """Test creating a delivery log with PENDING status."""
        log = WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
            attempt_number=1,
            status=WebhookDeliveryLog.STATUS_PENDING,
        )
        assert log.status == WebhookDeliveryLog.STATUS_PENDING
        assert log.attempt_number == 1
        assert log.success is False

    def test_transition_pending_to_success(self, webhook_subscription, contract_event):
        """Test PENDING -> SUCCESS transition."""
        log = WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
            attempt_number=1,
            status=WebhookDeliveryLog.STATUS_PENDING,
        )
        
        # Transition to SUCCESS
        log.status = WebhookDeliveryLog.STATUS_SUCCESS
        log.status_code = 200
        log.success = True
        log.duration_ms = 150
        log.save()
        
        log.refresh_from_db()
        assert log.status == WebhookDeliveryLog.STATUS_SUCCESS
        assert log.status_code == 200
        assert log.success is True
        assert log.duration_ms == 150

    def test_transition_pending_to_failed(self, webhook_subscription, contract_event):
        """Test PENDING -> FAILED transition."""
        log = WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
            attempt_number=1,
            status=WebhookDeliveryLog.STATUS_PENDING,
        )
        
        # Transition to FAILED
        log.status = WebhookDeliveryLog.STATUS_FAILED
        log.status_code = 500
        log.success = False
        log.error = "Internal Server Error"
        log.duration_ms = 5000
        log.save()
        
        log.refresh_from_db()
        assert log.status == WebhookDeliveryLog.STATUS_FAILED
        assert log.status_code == 500
        assert log.success is False
        assert log.error == "Internal Server Error"

    def test_transition_failed_to_dead_letter(self, webhook_subscription, contract_event):
        """Test FAILED -> DEAD_LETTER transition after retries exhausted."""
        # Create failed log (simulating retries exhausted)
        log = WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
            attempt_number=5,  # Max retries exhausted
            status=WebhookDeliveryLog.STATUS_FAILED,
            status_code=500,
            success=False,
            error="Connection timeout after retries",
        )
        
        # Transition to DEAD_LETTER
        log.status = WebhookDeliveryLog.STATUS_DEAD_LETTER
        log.save()
        
        log.refresh_from_db()
        assert log.status == WebhookDeliveryLog.STATUS_DEAD_LETTER
        assert log.attempt_number == 5

    def test_attempt_counter_increments_on_retry(self, webhook_subscription, contract_event):
        """Test that attempt_number increments on each retry."""
        # First attempt
        log1 = WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
            attempt_number=1,
            status=WebhookDeliveryLog.STATUS_FAILED,
            status_code=500,
            success=False,
        )
        assert log1.attempt_number == 1

        # Second attempt (retry)
        log2 = WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
            attempt_number=2,
            status=WebhookDeliveryLog.STATUS_FAILED,
            status_code=502,
            success=False,
        )
        assert log2.attempt_number == 2

        # Third attempt (retry)
        log3 = WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
            attempt_number=3,
            status=WebhookDeliveryLog.STATUS_SUCCESS,
            status_code=200,
            success=True,
        )
        assert log3.attempt_number == 3

    def test_multiple_delivery_logs_for_same_event(self, webhook_subscription, contract_event):
        """Test multiple delivery logs can exist for the same event (retries)."""
        logs = []
        for i in range(1, 6):
            log = WebhookDeliveryLog.objects.create(
                subscription=webhook_subscription,
                event=contract_event,
                attempt_number=i,
                status=WebhookDeliveryLog.STATUS_FAILED if i < 5 else WebhookDeliveryLog.STATUS_DEAD_LETTER,
                status_code=500 if i < 5 else None,
                success=False if i < 5 else False,
            )
            logs.append(log)

        assert WebhookDeliveryLog.objects.filter(event=contract_event).count() == 5
        assert logs[0].attempt_number == 1
        assert logs[4].attempt_number == 5
        assert logs[4].status == WebhookDeliveryLog.STATUS_DEAD_LETTER

    def test_success_after_multiple_failures(self, webhook_subscription, contract_event):
        """Test SUCCESS after multiple FAILED attempts."""
        # First attempt fails
        WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
            attempt_number=1,
            status=WebhookDeliveryLog.STATUS_FAILED,
            status_code=503,
            success=False,
        )
        
        # Second attempt fails
        WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
            attempt_number=2,
            status=WebhookDeliveryLog.STATUS_FAILED,
            status_code=503,
            success=False,
        )
        
        # Third attempt succeeds
        log = WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
            attempt_number=3,
            status=WebhookDeliveryLog.STATUS_SUCCESS,
            status_code=200,
            success=True,
            duration_ms=250,
        )
        
        assert log.attempt_number == 3
        assert log.status == WebhookDeliveryLog.STATUS_SUCCESS
        assert log.success is True
        assert log.duration_ms == 250

    def test_response_body_truncation(self, webhook_subscription, contract_event):
        """Test response_body is truncated to 4KB."""
        long_response = "x" * 5000  # 5KB
        
        log = WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
            attempt_number=1,
            status=WebhookDeliveryLog.STATUS_SUCCESS,
            status_code=200,
            success=True,
            response_body=long_response,
        )
        
        log.refresh_from_db()
        # Should be truncated to 4096 bytes (RESPONSE_BODY_MAX_BYTES)
        assert len(log.response_body.encode("utf-8")) <= WebhookDeliveryLog.RESPONSE_BODY_MAX_BYTES

    def test_status_choices_constants(self):
        """Test that status choice constants are defined correctly."""
        assert WebhookDeliveryLog.STATUS_PENDING == "pending"
        assert WebhookDeliveryLog.STATUS_SUCCESS == "success"
        assert WebhookDeliveryLog.STATUS_FAILED == "failed"
        assert WebhookDeliveryLog.STATUS_DEAD_LETTER == "dead_letter"
        
        choices = dict(WebhookDeliveryLog.STATUS_CHOICES)
        assert choices["pending"] == "Pending"
        assert choices["success"] == "Success"
        assert choices["failed"] == "Failed"
        assert choices["dead_letter"] == "Dead Letter"

    def test_default_values(self, webhook_subscription, contract_event):
        """Test default values on creation."""
        log = WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
        )
        
        assert log.attempt_number == 1
        assert log.status == WebhookDeliveryLog.STATUS_PENDING
        assert log.success is False
        assert log.acknowledged is False
        assert log.within_sla is False
        assert log.response_body == ""

    def test_ordering_by_timestamp(self, webhook_subscription, contract_event):
        """Test logs are ordered by timestamp descending."""
        log1 = WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
            attempt_number=1,
            status=WebhookDeliveryLog.STATUS_PENDING,
        )
        log2 = WebhookDeliveryLog.objects.create(
            subscription=webhook_subscription,
            event=contract_event,
            attempt_number=2,
            status=WebhookDeliveryLog.STATUS_SUCCESS,
        )
        
        logs = list(WebhookDeliveryLog.objects.filter(event=contract_event))
        # Default ordering is -timestamp (Meta.ordering)
        assert logs[0].attempt_number == 2  # Latest first
        assert logs[1].attempt_number == 1