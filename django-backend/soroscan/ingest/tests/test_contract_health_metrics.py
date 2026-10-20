"""
Tests for contract health Prometheus metrics (issue #1665).

Covers:
  - Metric definitions and exports in soroscan.ingest.metrics
  - Gauge emission for healthy, degraded, and failed statuses
  - State transition counter increments (healthy -> degraded -> failed -> healthy)
  - Full check_contract_health task execution updating gauges across multiple contracts
"""

from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone

from soroscan.ingest import metrics as ingest_metrics
from soroscan.ingest.models import ContractHealthCheck
from soroscan.ingest.tasks import (
    _check_single_contract_health,
    _short_contract_id,
    check_contract_health,
)
from soroscan.ingest.tests.factories import (
    ContractEventFactory,
    TrackedContractFactory,
    UserFactory,
)


def _get_gauge_value(metric, **labels) -> float:
    return metric.labels(**labels)._value.get()


def _get_counter_value(metric, **labels) -> float:
    return metric.labels(**labels)._value.get()


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def contract(user):
    return TrackedContractFactory(owner=user, is_active=True, is_paused=False)


def _event_at(contract, minutes_ago: int, decoding_status: str = "success"):
    ts = timezone.now() - timedelta(minutes=minutes_ago)
    return ContractEventFactory(
        contract=contract,
        timestamp=ts,
        decoding_status=decoding_status,
    )


class TestMetricsModuleExports:
    def test_metrics_exported_in_all(self):
        assert "contract_health_status_gauge" in ingest_metrics.__all__
        assert "contract_health_transitions_total" in ingest_metrics.__all__
        assert "CONTRACT_HEALTH_STATUS_MAP" in ingest_metrics.__all__

    def test_status_numeric_mapping(self):
        assert ingest_metrics.CONTRACT_HEALTH_STATUS_MAP["healthy"] == 0
        assert ingest_metrics.CONTRACT_HEALTH_STATUS_MAP["degraded"] == 1
        assert ingest_metrics.CONTRACT_HEALTH_STATUS_MAP["failed"] == 2


@pytest.mark.django_db
class TestContractHealthMetricsEmission:

    def test_single_contract_health_gauge_healthy(self, contract):
        _event_at(contract, minutes_ago=5)
        short_cid = _short_contract_id(contract.contract_id)

        status, _ = _check_single_contract_health(contract)
        assert status == ContractHealthCheck.Status.HEALTHY

        val = _get_gauge_value(ingest_metrics.contract_health_status_gauge, contract_id=short_cid)
        assert val == 0.0

    def test_single_contract_health_gauge_degraded_and_transitions(self, contract):
        short_cid = _short_contract_id(contract.contract_id)

        # 1. Initially healthy
        _event_at(contract, minutes_ago=5)
        _check_single_contract_health(contract)
        assert _get_gauge_value(ingest_metrics.contract_health_status_gauge, contract_id=short_cid) == 0.0

        # Read baseline counter for healthy -> degraded
        before_transitions = _get_counter_value(
            ingest_metrics.contract_health_transitions_total,
            contract_id=short_cid,
            from_status="healthy",
            to_status="degraded",
        )

        # 2. Shift time to degraded (> 30 min)
        past = timezone.now() + timedelta(minutes=40)
        status, _ = _check_single_contract_health(contract, now=past)
        assert status == ContractHealthCheck.Status.DEGRADED

        assert _get_gauge_value(ingest_metrics.contract_health_status_gauge, contract_id=short_cid) == 1.0
        after_transitions = _get_counter_value(
            ingest_metrics.contract_health_transitions_total,
            contract_id=short_cid,
            from_status="healthy",
            to_status="degraded",
        )
        assert after_transitions == before_transitions + 1.0

        # Check unchanged status does not increment transitions
        past_again = past + timedelta(minutes=5)
        _check_single_contract_health(contract, now=past_again)
        assert _get_counter_value(
            ingest_metrics.contract_health_transitions_total,
            contract_id=short_cid,
            from_status="healthy",
            to_status="degraded",
        ) == after_transitions

    def test_transitions_to_failed(self, contract):
        short_cid = _short_contract_id(contract.contract_id)

        # Start degraded
        health = ContractHealthCheck.objects.create(
            contract=contract,
            status=ContractHealthCheck.Status.DEGRADED,
        )

        before_fail = _get_counter_value(
            ingest_metrics.contract_health_transitions_total,
            contract_id=short_cid,
            from_status="degraded",
            to_status="failed",
        )

        # Over 2 hours since last event -> failed
        far_future = timezone.now() + timedelta(hours=3)
        status, _ = _check_single_contract_health(contract, now=far_future)
        assert status == ContractHealthCheck.Status.FAILED

        assert _get_gauge_value(ingest_metrics.contract_health_status_gauge, contract_id=short_cid) == 2.0
        after_fail = _get_counter_value(
            ingest_metrics.contract_health_transitions_total,
            contract_id=short_cid,
            from_status="degraded",
            to_status="failed",
        )
        assert after_fail == before_fail + 1.0


@pytest.mark.django_db
class TestCheckContractHealthTaskMetrics:

    def test_task_updates_gauges_for_multiple_contracts(self, user):
        c_healthy = TrackedContractFactory(owner=user, is_active=True, is_paused=False)
        c_degraded = TrackedContractFactory(owner=user, is_active=True, is_paused=False)

        _event_at(c_healthy, minutes_ago=5)
        _event_at(c_degraded, minutes_ago=45)

        with patch("soroscan.ingest.tasks.send_health_alert") as mock_alert:
            mock_alert.delay = mock_alert
            result = check_contract_health.apply().get()

        assert result["healthy"] >= 1
        assert result["degraded"] >= 1

        val_healthy = _get_gauge_value(
            ingest_metrics.contract_health_status_gauge,
            contract_id=_short_contract_id(c_healthy.contract_id),
        )
        val_degraded = _get_gauge_value(
            ingest_metrics.contract_health_status_gauge,
            contract_id=_short_contract_id(c_degraded.contract_id),
        )

        assert val_healthy == 0.0
        assert val_degraded == 1.0
