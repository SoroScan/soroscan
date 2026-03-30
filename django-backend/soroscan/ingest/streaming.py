"""
Event streaming producers for Kafka and Google Pub/Sub.
"""
import json
import logging
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

def _get_metrics():
    from soroscan.ingest import metrics
    return metrics

class BaseProducer:
    def publish(self, contract_id: str, event_data: dict[str, Any]):
        raise NotImplementedError

class KafkaProducer(BaseProducer):
    def __init__(self, bootstrap_servers: list[str], topic_template: str):
        try:
            from kafka import KafkaProducer as KP
            self.producer = KP(
                bootstrap_servers=bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                # Async by default, non-blocking
                acks=1,
                retries=3,
            )
            self.topic_template = topic_template
            logger.info("Kafka producer initialized with servers: %s", bootstrap_servers)
        except Exception:
            logger.exception("Failed to initialize Kafka producer")
            self.producer = None

    def publish(self, contract_id: str, event_data: dict[str, Any]):
        if not self.producer:
            return

        topic = self.topic_template.format(contract_id=contract_id)
        try:
            # send() is asynchronous and returns a Future
            self.producer.send(topic, event_data).add_callback(
                self._on_success
            ).add_errback(
                self._on_error
            )
        except Exception:
            logger.exception("Failed to send event to Kafka topic %s", topic)
            _get_metrics().event_streaming_total.labels(status="failure", backend="kafka").inc()

    def _on_success(self, record_metadata):
        _get_metrics().event_streaming_total.labels(status="success", backend="kafka").inc()

    def _on_error(self, exc):
        logger.warning("Kafka publish failed: %s", exc)
        _get_metrics().event_streaming_total.labels(status="failure", backend="kafka").inc()

class PubSubProducer(BaseProducer):
    def __init__(self, project_id: str, topic_template: str):
        try:
            from google.cloud import pubsub_v1
            self.publisher = pubsub_v1.PublisherClient()
            self.project_id = project_id
            self.topic_template = topic_template
            logger.info("Pub/Sub producer initialized for project: %s", project_id)
        except Exception:
            logger.exception("Failed to initialize Pub/Sub producer")
            self.publisher = None

    def publish(self, contract_id: str, event_data: dict[str, Any]):
        if not self.publisher:
            return

        topic_name = self.topic_template.format(contract_id=contract_id)
        topic_path = self.publisher.topic_path(self.project_id, topic_name)
        
        try:
            data = json.dumps(event_data).encode("utf-8")
            # publish() is asynchronous and returns a Future
            future = self.publisher.publish(topic_path, data)
            future.add_done_callback(self._on_complete)
        except Exception:
            logger.exception("Failed to publish event to Pub/Sub topic %s", topic_path)
            _get_metrics().event_streaming_total.labels(status="failure", backend="pubsub").inc()

    def _on_complete(self, future):
        try:
            future.result()
            _get_metrics().event_streaming_total.labels(status="success", backend="pubsub").inc()
        except Exception as exc:
            logger.warning("Pub/Sub publish failed: %s", exc)
            _get_metrics().event_streaming_total.labels(status="failure", backend="pubsub").inc()

# Singleton-ish access to the configured producer
_producer_instance = None

def get_producer():
    global _producer_instance
    if _producer_instance is not None:
        return _producer_instance

    config = settings.EVENT_STREAMING
    if not config.get("enabled"):
        return None

    backend = config.get("backend")
    if backend == "kafka":
        kafka_cfg = config.get("kafka", {})
        _producer_instance = KafkaProducer(
            bootstrap_servers=kafka_cfg.get("bootstrap_servers", ["localhost:9092"]),
            topic_template=kafka_cfg.get("topic_template", "soroscan-events-{contract_id}"),
        )
    elif backend == "pubsub":
        ps_cfg = config.get("pubsub", {})
        _producer_instance = PubSubProducer(
            project_id=ps_cfg.get("project_id", ""),
            topic_template=ps_cfg.get("topic_template", "soroscan-events-{contract_id}"),
        )
    else:
        logger.warning("Unknown streaming backend: %s", backend)
        return None

    return _producer_instance
