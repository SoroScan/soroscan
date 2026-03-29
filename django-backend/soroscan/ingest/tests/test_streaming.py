
from unittest.mock import MagicMock, patch
from django.test import TestCase, override_settings
from soroscan.ingest.models import ContractEvent, TrackedContract
from soroscan.ingest.tasks import stream_event_to_external, _upsert_contract_event
import json

class EventStreamingTests(TestCase):
    def setUp(self):
        self.contract = TrackedContract.objects.create(
            contract_id="CA1234567890",
            is_active=True
        )
        self.event = ContractEvent.objects.create(
            contract=self.contract,
            ledger=100,
            event_index=1,
            tx_hash="hash123",
            event_type="transfer",
            payload={"amount": 100}
        )

    @override_settings(EVENT_STREAMING={
        "enabled": True,
        "backend": "kafka",
        "kafka": {"bootstrap_servers": ["localhost:9092"], "topic_template": "events-{contract_id}"}
    })
    @patch("soroscan.ingest.tasks.KafkaProducer")
    def test_stream_to_kafka_success(self, mock_kafka_producer_cls):
        mock_producer = MagicMock()
        mock_kafka_producer_cls.return_value = mock_producer
        
        # Reset global producer to force re-init with mock
        import soroscan.ingest.tasks
        soroscan.ingest.tasks._KAFKA_PRODUCER = None
        
        stream_event_to_external(self.event.id)
        
        mock_producer.send.assert_called_once()
        args, kwargs = mock_producer.send.call_args
        self.assertEqual(args[0], "events-CA1234567890")
        self.assertEqual(args[1]["contract_id"], "CA1234567890")
        self.assertEqual(args[1]["event_type"], "transfer")

    @override_settings(EVENT_STREAMING={
        "enabled": True,
        "backend": "pubsub",
        "pubsub": {"project_id": "test-project", "topic_template": "events-{contract_id}"}
    })
    @patch("google.cloud.pubsub_v1.PublisherClient")
    def test_stream_to_pubsub_success(self, mock_pubsub_client_cls):
        mock_publisher = MagicMock()
        mock_pubsub_client_cls.return_value = mock_publisher
        mock_publisher.topic_path.return_value = "projects/test-project/topics/events-CA1234567890"
        
        # Reset global producer
        import soroscan.ingest.tasks
        soroscan.ingest.tasks._PUBSUB_PUBLISHER = None
        
        stream_event_to_external(self.event.id)
        
        mock_publisher.publish.assert_called_once()
        args, kwargs = mock_publisher.publish.call_args
        self.assertEqual(args[0], "projects/test-project/topics/events-CA1234567890")
        
        # Verify payload contains event info
        payload_data = json.loads(args[1].decode('utf-8'))
        self.assertEqual(payload_data["contract_id"], "CA1234567890")

    @override_settings(EVENT_STREAMING={"enabled": False})
    @patch("soroscan.ingest.tasks.KafkaProducer")
    def test_streaming_disabled(self, mock_kafka_producer_cls):
        stream_event_to_external(self.event.id)
        mock_kafka_producer_cls.assert_not_called()

    @override_settings(EVENT_STREAMING={"enabled": True, "backend": "kafka"})
    @patch("soroscan.ingest.tasks.stream_event_to_external.delay")
    def test_upsert_triggers_streaming(self, mock_stream_delay):
        # Mocking event data
        event_data = MagicMock()
        event_data.ledger = 101
        event_data.tx_hash = "hash101"
        event_data.type = "swap"
        event_data.value = {"x": 1}
        event_data.xdr = "xdr101"
        
        # Mocking check_ingest_rate to always allow
        with patch("soroscan.ingest.tasks.check_ingest_rate", return_value=True):
            _upsert_contract_event(self.contract, event_data)
            
        mock_stream_delay.assert_called_once()
