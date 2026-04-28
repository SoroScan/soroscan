"""
Tests for webhook failures endpoint.
"""
import pytest
from django.urls import reverse
from rest_framework import status

from soroscan.ingest.models import WebhookDeliveryLog
from soroscan.ingest.tests.factories import (
    ContractEventFactory,
    UserFactory,
    WebhookDeliveryLogFactory,
    WebhookSubscriptionFactory,
)


@pytest.mark.django_db
class TestWebhookFailuresEndpoint:
    """Test suite for GET /api/webhooks/failures/ endpoint."""

    def test_requires_authentication(self, api_client):
        """Endpoint requires authentication."""
        url = reverse("webhook-failures")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_returns_only_failures(self, api_client):
        """Endpoint returns only failed webhook deliveries."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        subscription = WebhookSubscriptionFactory(contract__owner=user)
        event = ContractEventFactory(contract=subscription.contract)
        
        # Create one success and one failure
        WebhookDeliveryLogFactory(
            subscription=subscription,
            event=event,
            success=True,
            status_code=200,
        )
        failure = WebhookDeliveryLogFactory(
            subscription=subscription,
            event=event,
            success=False,
            status_code=500,
            error="Internal Server Error",
        )
        
        url = reverse("webhook-failures")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["id"] == failure.id
        assert response.data[0]["success"] is False

    def test_returns_correct_fields(self, api_client):
        """Endpoint returns URL, error message, and HTTP status code."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        subscription = WebhookSubscriptionFactory(
            contract__owner=user,
            target_url="https://example.com/webhook",
        )
        event = ContractEventFactory(contract=subscription.contract)
        
        failure = WebhookDeliveryLogFactory(
            subscription=subscription,
            event=event,
            success=False,
            status_code=503,
            error="Service Unavailable",
            attempt_number=2,
        )
        
        url = reverse("webhook-failures")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        
        data = response.data[0]
        assert data["subscription_id"] == subscription.id
        assert data["target_url"] == "https://example.com/webhook"
        assert data["status_code"] == 503
        assert data["error"] == "Service Unavailable"
        assert data["attempt_number"] == 2
        assert "timestamp" in data

    def test_filter_by_subscription_id(self, api_client):
        """Endpoint can filter by subscription_id."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        subscription1 = WebhookSubscriptionFactory(contract__owner=user)
        subscription2 = WebhookSubscriptionFactory(contract__owner=user)
        
        event1 = ContractEventFactory(contract=subscription1.contract)
        event2 = ContractEventFactory(contract=subscription2.contract)
        
        failure1 = WebhookDeliveryLogFactory(
            subscription=subscription1,
            event=event1,
            success=False,
        )
        WebhookDeliveryLogFactory(
            subscription=subscription2,
            event=event2,
            success=False,
        )
        
        url = reverse("webhook-failures")
        response = api_client.get(url, {"subscription_id": subscription1.id})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["id"] == failure1.id
        assert response.data[0]["subscription_id"] == subscription1.id

    def test_only_shows_own_webhook_failures(self, api_client):
        """Users can only see failures for their own webhooks."""
        user1 = UserFactory()
        user2 = UserFactory()
        api_client.force_authenticate(user=user1)
        
        # User1's webhook
        subscription1 = WebhookSubscriptionFactory(contract__owner=user1)
        event1 = ContractEventFactory(contract=subscription1.contract)
        failure1 = WebhookDeliveryLogFactory(
            subscription=subscription1,
            event=event1,
            success=False,
        )
        
        # User2's webhook
        subscription2 = WebhookSubscriptionFactory(contract__owner=user2)
        event2 = ContractEventFactory(contract=subscription2.contract)
        WebhookDeliveryLogFactory(
            subscription=subscription2,
            event=event2,
            success=False,
        )
        
        url = reverse("webhook-failures")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["id"] == failure1.id

    def test_limit_parameter(self, api_client):
        """Endpoint respects limit parameter."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        subscription = WebhookSubscriptionFactory(contract__owner=user)
        event = ContractEventFactory(contract=subscription.contract)
        
        # Create 5 failures
        for _ in range(5):
            WebhookDeliveryLogFactory(
                subscription=subscription,
                event=event,
                success=False,
            )
        
        url = reverse("webhook-failures")
        response = api_client.get(url, {"limit": 3})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

    def test_limit_default_is_100(self, api_client):
        """Default limit is 100."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        subscription = WebhookSubscriptionFactory(contract__owner=user)
        event = ContractEventFactory(contract=subscription.contract)
        
        # Create 150 failures
        for _ in range(150):
            WebhookDeliveryLogFactory(
                subscription=subscription,
                event=event,
                success=False,
            )
        
        url = reverse("webhook-failures")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 100

    def test_limit_max_is_1000(self, api_client):
        """Maximum limit is 1000."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        subscription = WebhookSubscriptionFactory(contract__owner=user)
        event = ContractEventFactory(contract=subscription.contract)
        
        # Create 1500 failures
        for _ in range(1500):
            WebhookDeliveryLogFactory(
                subscription=subscription,
                event=event,
                success=False,
            )
        
        url = reverse("webhook-failures")
        response = api_client.get(url, {"limit": 2000})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1000

    def test_ordered_by_most_recent_first(self, api_client):
        """Results are ordered by timestamp descending (most recent first)."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        subscription = WebhookSubscriptionFactory(contract__owner=user)
        event = ContractEventFactory(contract=subscription.contract)
        
        # Create failures with different timestamps
        failure1 = WebhookDeliveryLogFactory(
            subscription=subscription,
            event=event,
            success=False,
        )
        failure2 = WebhookDeliveryLogFactory(
            subscription=subscription,
            event=event,
            success=False,
        )
        failure3 = WebhookDeliveryLogFactory(
            subscription=subscription,
            event=event,
            success=False,
        )
        
        url = reverse("webhook-failures")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3
        
        # Most recent should be first
        assert response.data[0]["id"] == failure3.id
        assert response.data[1]["id"] == failure2.id
        assert response.data[2]["id"] == failure1.id

    def test_invalid_subscription_id_returns_400(self, api_client):
        """Invalid subscription_id returns 400 error."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        url = reverse("webhook-failures")
        response = api_client.get(url, {"subscription_id": "invalid"})
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_handles_null_status_code(self, api_client):
        """Endpoint handles failures with null status_code (network errors)."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        subscription = WebhookSubscriptionFactory(contract__owner=user)
        event = ContractEventFactory(contract=subscription.contract)
        
        failure = WebhookDeliveryLogFactory(
            subscription=subscription,
            event=event,
            success=False,
            status_code=None,
            error="Connection timeout",
        )
        
        url = reverse("webhook-failures")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["status_code"] is None
        assert response.data[0]["error"] == "Connection timeout"

    def test_empty_result_when_no_failures(self, api_client):
        """Returns empty list when there are no failures."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        subscription = WebhookSubscriptionFactory(contract__owner=user)
        event = ContractEventFactory(contract=subscription.contract)
        
        # Create only successful deliveries
        WebhookDeliveryLogFactory(
            subscription=subscription,
            event=event,
            success=True,
            status_code=200,
        )
        
        url = reverse("webhook-failures")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_includes_multiple_attempts_for_same_event(self, api_client):
        """Shows all failed attempts including retries."""
        user = UserFactory()
        api_client.force_authenticate(user=user)
        
        subscription = WebhookSubscriptionFactory(contract__owner=user)
        event = ContractEventFactory(contract=subscription.contract)
        
        # Create multiple failed attempts (retries)
        failure1 = WebhookDeliveryLogFactory(
            subscription=subscription,
            event=event,
            success=False,
            attempt_number=1,
            status_code=500,
        )
        failure2 = WebhookDeliveryLogFactory(
            subscription=subscription,
            event=event,
            success=False,
            attempt_number=2,
            status_code=503,
        )
        
        url = reverse("webhook-failures")
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        
        # Verify both attempts are returned
        attempt_numbers = {item["attempt_number"] for item in response.data}
        assert attempt_numbers == {1, 2}
