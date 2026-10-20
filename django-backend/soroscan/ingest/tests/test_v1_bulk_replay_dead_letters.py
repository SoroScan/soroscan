import pytest
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from soroscan.ingest.models import (
    TrackedContract,
    WebhookDeadLetter,
    WebhookSubscription,
)
from soroscan.v1.views import bulk_replay_dead_letters

User = get_user_model()


class BulkReplayDeadLettersPermissionTest(TestCase):
    """Issue #1664: non-owners cannot replay other tenants' dead letters."""

    def setUp(self):
        self.factory = APIRequestFactory()

        # Users
        self.owner = User.objects.create_user(
            username="owner_user", email="owner@example.com", password="password123"
        )
        self.other_user = User.objects.create_user(
            username="other_user", email="other@example.com", password="password123"
        )
        self.staff_user = User.objects.create_user(
            username="staff_user", email="staff@example.com", password="password123", is_staff=True
        )

        # Contract owned by self.owner
        self.contract = TrackedContract.objects.create(
            contract_id="C" + "A" * 55,
            name="OwnerContract",
            owner=self.owner,
        )

        # WebhookSubscription
        self.subscription = WebhookSubscription.objects.create(
            contract=self.contract,
            target_url="https://example.com/webhook",
            secret="0123456789abcdef",
        )

        # Dead letter for subscription
        self.dead_letter = WebhookDeadLetter.objects.create(
            subscription=self.subscription,
            reason="Timeout after 10s",
            resolved=False,
        )

    def test_other_user_cannot_replay_owner_dead_letter(self):
        """A non-owner non-staff user cannot replay another tenant's dead letter."""
        request = self.factory.post(
            "/v1/webhooks/dead-letters/bulk-replay",
            {"dead_letter_ids": [self.dead_letter.id]},
            format="json",
        )
        force_authenticate(request, user=self.other_user)

        response = bulk_replay_dead_letters(request)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        # No jobs created for unowned dead letters
        self.assertEqual(len(response.data.get("job_ids", [])), 0)

        # Dead letter remains unresolved
        self.dead_letter.refresh_from_db()
        self.assertFalse(self.dead_letter.resolved)

    def test_owner_can_replay_own_dead_letter(self):
        """The subscription contract owner can replay their own dead letter."""
        request = self.factory.post(
            "/v1/webhooks/dead-letters/bulk-replay",
            {"dead_letter_ids": [self.dead_letter.id]},
            format="json",
        )
        force_authenticate(request, user=self.owner)

        response = bulk_replay_dead_letters(request)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

    def test_staff_can_replay_any_dead_letter(self):
        """A staff user can replay any dead letter regardless of ownership."""
        request = self.factory.post(
            "/v1/webhooks/dead-letters/bulk-replay",
            {"dead_letter_ids": [self.dead_letter.id]},
            format="json",
        )
        force_authenticate(request, user=self.staff_user)

        response = bulk_replay_dead_letters(request)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
