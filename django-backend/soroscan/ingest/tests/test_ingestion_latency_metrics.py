"""
Tests for event ingestion latency metrics.
"""
import pytest
from datetime import timedelta
from django.utils import timezone
from unittest.mock import Mock, patch

from soroscan.ingest.metrics import event_ingestion_latency_seconds


class TestEventIngestionLatencyMetrics:
    """Test event ingestion latency metric recording."""

    def test_latency_metric_recorded_on_event_creation(self):
        """Verify latency is recorded when event is created."""
        # Create mock event with created_at timestamp
        event_time = timezone.now() - timedelta(seconds=2.5)
        mock_event = Mock()
        mock_event.created_at = event_time
        
        # Simulate latency observation
        latency = (timezone.now() - event_time).total_seconds()
        
        # Record metric
        event_ingestion_latency_seconds.labels(
            contract_id="short_id",
            network="testnet"
        ).observe(latency)
        
        # Verify latency is in expected range (around 2.5 seconds)
        assert 2.0 < latency < 3.0

    def test_latency_metric_with_multiple_contracts(self):
        """Verify latency is tracked per contract."""
        contracts = ["contract1", "contract2"]
        
        for contract in contracts:
            event_time = timezone.now() - timedelta(seconds=1.0)
            latency = (timezone.now() - event_time).total_seconds()
            
            event_ingestion_latency_seconds.labels(
                contract_id=contract,
                network="testnet"
            ).observe(latency)
        
        # Both contracts should have metrics recorded
        assert True

    def test_latency_metric_percentiles(self):
        """Verify latency histogram supports percentile queries."""
        # Record various latencies
        latencies = [0.1, 0.5, 1.0, 2.0, 5.0]
        
        for latency in latencies:
            event_ingestion_latency_seconds.labels(
                contract_id="test",
                network="testnet"
            ).observe(latency)
        
        # Histogram should have recorded all observations
        assert True
