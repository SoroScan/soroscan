"""
Tests for event streaming to Kafka and Pub/Sub.
"""
import pytest
from unittest.mock import MagicMock, patch
from django.conf import settings
from soroscan.ingest.tasks import process_new_event
from soroscan.ingest.streaming import get_producer, KafkaProducer, PubSubProducer
from .factories import ContractEventFactory, TrackedContractFactory

@pytest.mark.django_db
class TestEventStreaming:
    @patch("soroscan.ingest.streaming.KafkaProducer")
    def test_process_event_streams_to_kafka_when_enabled(self, MockKafkaProducer, contract):
        # Setup mock producer
        mock_producer_instance = MockKafkaProducer.return_value
        
        # Configure settings for Kafka
        streaming_settings = {
            "enabled": True,
            "backend": "kafka",
            "kafka": {
                "bootstrap_servers": ["localhost:9092"],
                "topic_template": "soroscan-events-{contract_id}",
            },
        }
        
        with patch.object(settings, "EVENT_STREAMING", streaming_settings):
            # Force re-initialization of producer singleton for test
            from soroscan.ingest import streaming
            streaming._producer_instance = None
            
            event = ContractEventFactory(
                contract=contract, event_type="swap", ledger=1000, event_index=0
            )
            event_data = {
                "contract_id": contract.contract_id,
                "event_type": "swap",
                "payload": event.payload,
                "ledger": event.ledger,
                "event_index": event.event_index,
                "tx_hash": event.tx_hash,
            }
            
            process_new_event.apply(args=[event_data])
            
            # Verify producer was initialized and publish was called
            MockKafkaProducer.assert_called_once()
            mock_producer_instance.publish.assert_called_once_with(
                contract.contract_id, event_data
            )

    @patch("soroscan.ingest.streaming.PubSubProducer")
    def test_process_event_streams_to_pubsub_when_enabled(self, MockPubSubProducer, contract):
        # Setup mock producer
        mock_producer_instance = MockPubSubProducer.return_value
        
        # Configure settings for Pub/Sub
        streaming_settings = {
            "enabled": True,
            "backend": "pubsub",
            "pubsub": {
                "project_id": "test-project",
                "topic_template": "soroscan-events-{contract_id}",
            },
        }
        
        with patch.object(settings, "EVENT_STREAMING", streaming_settings):
            # Force re-initialization of producer singleton for test
            from soroscan.ingest import streaming
            streaming._producer_instance = None
            
            event = ContractEventFactory(
                contract=contract, event_type="swap", ledger=2000, event_index=0
            )
            event_data = {
                "contract_id": contract.contract_id,
                "event_type": "swap",
                "payload": event.payload,
                "ledger": event.ledger,
                "event_index": event.event_index,
                "tx_hash": event.tx_hash,
            }
            
            process_new_event.apply(args=[event_data])
            
            # Verify producer was initialized and publish was called
            MockPubSubProducer.assert_called_once()
            mock_producer_instance.publish.assert_called_once_with(
                contract.contract_id, event_data
            )

    def test_process_event_no_streaming_when_disabled(self, contract):
        # Configure settings to disabled
        streaming_settings = {"enabled": False}
        
        with patch.object(settings, "EVENT_STREAMING", streaming_settings):
            # Force re-initialization
            from soroscan.ingest import streaming
            streaming._producer_instance = None
            
            with patch("soroscan.ingest.streaming.KafkaProducer") as MockKafka:
                event = ContractEventFactory(contract=contract)
                event_data = {"contract_id": contract.contract_id}
                process_new_event.apply(args=[event_data])
                
                MockKafka.assert_not_called()

    @patch("soroscan.ingest.streaming.KafkaProducer")
    def test_streaming_failure_does_not_block_process_new_event(self, MockKafkaProducer, contract):
        mock_producer_instance = MockKafkaProducer.return_value
        mock_producer_instance.publish.side_effect = Exception("Streaming failed")
        
        streaming_settings = {
            "enabled": True,
            "backend": "kafka",
            "kafka": {"bootstrap_servers": ["localhost:9092"], "topic_template": "test"},
        }
        
        with patch.object(settings, "EVENT_STREAMING", streaming_settings):
            from soroscan.ingest import streaming
            streaming._producer_instance = None
            
            event_data = {"contract_id": contract.contract_id, "event_type": "swap", "ledger": 3000}
            
            # Should NOT raise exception
            process_new_event.apply(args=[event_data])
            
            mock_producer_instance.publish.assert_called_once()
