from django.test import TestCase
from rest_framework.exceptions import ValidationError
from soroscan.ingest.serializers import WebhookSubscriptionSerializer
from soroscan.ingest.tests.factories import TrackedContractFactory

class WebhookPayloadLimitTests(TestCase):
    def setUp(self):
        self.contract = TrackedContractFactory()

    def test_oversized_payload_rejected(self):
        self.contract.metadata = {"estimated_payload_size": 1048577}
        self.contract.save()
        
        serializer = WebhookSubscriptionSerializer(data={
            "contract": self.contract.id,
            "target_url": "https://example.com/webhook",
            "secret": "testsecret123"
        })
        
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)
            
        self.assertIn("contract", serializer.errors)
        self.assertEqual(
            serializer.errors["contract"][0],
            "Estimated payload exceeds 1MB limit."
        )

    def test_massive_events_rejected(self):
        self.contract.metadata = {"is_massive": True}
        self.contract.save()
        
        serializer = WebhookSubscriptionSerializer(data={
            "contract": self.contract.id,
            "target_url": "https://example.com/webhook",
            "secret": "testsecret123"
        })
        
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)
            
        self.assertIn("contract", serializer.errors)
        self.assertEqual(
            serializer.errors["contract"][0],
            "Contract events are known to be massive."
        )

    def test_valid_payload_accepted(self):
        self.contract.metadata = {"estimated_payload_size": 500000}
        self.contract.save()
        
        serializer = WebhookSubscriptionSerializer(data={
            "contract": self.contract.id,
            "target_url": "https://example.com/webhook",
            "secret": "testsecret123"
        })
        
        self.assertTrue(serializer.is_valid())
