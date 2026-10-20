from django.test import TestCase
from rest_framework.exceptions import ValidationError

from soroscan.ingest.models import WebhookSubscription
from soroscan.ingest.serializers import WebhookSubscriptionSerializer
from soroscan.ingest.tests.factories import TrackedContractFactory


class WebhookTimeoutAndBackoffSerializationTests(TestCase):
    """
    Regression tests for Issue #1648:
    Ensure timeout_seconds, retry_backoff_strategy, and retry_backoff_seconds
    are exposed, readable, writable, and properly validated in WebhookSubscriptionSerializer.
    """

    def setUp(self):
        self.contract = TrackedContractFactory()

    def _base_data(self, **overrides):
        data = {
            "contract": self.contract.id,
            "target_url": "https://example.com/webhook-endpoint",
            "secret": "supersecretkey123",
        }
        data.update(overrides)
        return data

    def test_fields_are_writable_and_readable_in_serializer(self):
        payload = self._base_data(
            timeout_seconds=25,
            retry_backoff_strategy=WebhookSubscription.BACKOFF_LINEAR,
            retry_backoff_seconds=15,
        )
        serializer = WebhookSubscriptionSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        instance = serializer.save()
        self.assertEqual(instance.timeout_seconds, 25)
        self.assertEqual(instance.retry_backoff_strategy, WebhookSubscription.BACKOFF_LINEAR)
        self.assertEqual(instance.retry_backoff_seconds, 15)

        # Ensure representation exposes the fields
        rep = WebhookSubscriptionSerializer(instance).data
        self.assertEqual(rep["timeout_seconds"], 25)
        self.assertEqual(rep["retry_backoff_strategy"], WebhookSubscription.BACKOFF_LINEAR)
        self.assertEqual(rep["retry_backoff_seconds"], 15)

    def test_default_values_when_omitted(self):
        payload = self._base_data()
        serializer = WebhookSubscriptionSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()

        # Defaults from model definition
        self.assertEqual(instance.timeout_seconds, 10)
        self.assertEqual(instance.retry_backoff_strategy, WebhookSubscription.BACKOFF_EXPONENTIAL)
        self.assertEqual(instance.retry_backoff_seconds, 2)

    def test_timeout_seconds_bounds_validation(self):
        # Must be between 1 and 60
        invalid_cases = [0, -5, 61, 120]
        for val in invalid_cases:
            serializer = WebhookSubscriptionSerializer(data=self._base_data(timeout_seconds=val))
            self.assertFalse(serializer.is_valid())
            self.assertIn("timeout_seconds", serializer.errors)

    def test_retry_backoff_seconds_bounds_validation(self):
        # Must be between 1 and 3600
        invalid_cases = [0, -1, 3601, 10000]
        for val in invalid_cases:
            serializer = WebhookSubscriptionSerializer(data=self._base_data(retry_backoff_seconds=val))
            self.assertFalse(serializer.is_valid())
            self.assertIn("retry_backoff_seconds", serializer.errors)

    def test_retry_backoff_strategy_validation(self):
        # Only exponential, linear, fixed allowed
        serializer = WebhookSubscriptionSerializer(data=self._base_data(retry_backoff_strategy="random_invalid"))
        self.assertFalse(serializer.is_valid())
        self.assertIn("retry_backoff_strategy", serializer.errors)
