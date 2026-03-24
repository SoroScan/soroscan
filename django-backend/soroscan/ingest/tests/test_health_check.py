"""
Integration tests for issue #110: Contract health checks.

Covers:
- ContractHealthCheck model creation and status derivation
- check_contract_health Celery task (healthy / degraded / unreachable)
- GET /api/ingest/contracts/{id}/health/         — latest snapshot
- GET /api/ingest/contracts/{id}/health/history/ — paginated history
- POST /api/ingest/contracts/{id}/health/run/    — on-demand trigger
"""
import pytest
from unittest.mock import MagicMock, patch
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from soroscan.ingest.models import ContractHealthCheck, TrackedContract
from soroscan.ingest.tasks import check_contract_health

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def user(db):
    return User.objects.create_user(username="healthtest", password="pass")


@pytest.fixture
def contract(db, user):
    return TrackedContract.objects.create(
        contract_id="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
        name="Health Test Contract",
        owner=user,
        last_indexed_ledger=1000,
    )


@pytest.fixture
def api_client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def anon_client():
    return APIClient()


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestContractHealthCheckModel:
    def test_create_healthy(self, contract):
        check = ContractHealthCheck.objects.create(
            contract=contract,
            status=ContractHealthCheck.STATUS_HEALTHY,
            last_ledger_on_chain=1010,
            last_indexed_ledger=1000,
            ledger_lag=10,
            rpc_reachable=True,
            response_time_ms=42.5,
        )
        assert check.pk is not None
        assert str(check).startswith("HealthCheck(")

    def test_create_unreachable(self, contract):
        check = ContractHealthCheck.objects.create(
            contract=contract,
            status=ContractHealthCheck.STATUS_UNREACHABLE,
            rpc_reachable=False,
            error_detail="Connection refused",
        )
        assert check.status == "unreachable"

    def test_ordering_newest_first(self, contract):
        ContractHealthCheck.objects.create(contract=contract, status="healthy")
        ContractHealthCheck.objects.create(contract=contract, status="degraded")
        statuses = list(
            ContractHealthCheck.objects.filter(contract=contract).values_list("status", flat=True)
        )
        assert statuses[0] == "degraded"


# ---------------------------------------------------------------------------
# Task tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCheckContractHealthTask:
    def _mock_ledger(self, sequence: int):
        mock = MagicMock()
        mock.sequence = sequence
        return mock

    def test_healthy_when_lag_small(self, contract):
        with patch("soroscan.ingest.tasks.SorobanClient") as MockClient:
            MockClient.return_value.server.get_latest_ledger.return_value = self._mock_ledger(1050)
            result = check_contract_health(contract_id=contract.contract_id)

        assert result["healthy"] == 1
        check = ContractHealthCheck.objects.filter(contract=contract).first()
        assert check.status == ContractHealthCheck.STATUS_HEALTHY
        assert check.ledger_lag == 50
        assert check.rpc_reachable is True

    def test_degraded_when_lag_over_threshold(self, contract):
        # last_indexed_ledger=1000, on_chain=1200 → lag=200 → degraded
        with patch("soroscan.ingest.tasks.SorobanClient") as MockClient:
            MockClient.return_value.server.get_latest_ledger.return_value = self._mock_ledger(1200)
            result = check_contract_health(contract_id=contract.contract_id)

        assert result["degraded"] == 1
        check = ContractHealthCheck.objects.filter(contract=contract).first()
        assert check.status == ContractHealthCheck.STATUS_DEGRADED

    def test_unreachable_when_rpc_fails(self, contract):
        with patch("soroscan.ingest.tasks.SorobanClient") as MockClient:
            MockClient.return_value.server.get_latest_ledger.side_effect = Exception("timeout")
            result = check_contract_health(contract_id=contract.contract_id)

        assert result["unreachable"] == 1
        check = ContractHealthCheck.objects.filter(contract=contract).first()
        assert check.status == ContractHealthCheck.STATUS_UNREACHABLE
        assert check.rpc_reachable is False
        assert "timeout" in check.error_detail

    def test_unreachable_when_lag_very_large(self, contract):
        # lag >= 500 → unreachable
        with patch("soroscan.ingest.tasks.SorobanClient") as MockClient:
            MockClient.return_value.server.get_latest_ledger.return_value = self._mock_ledger(1600)
            result = check_contract_health(contract_id=contract.contract_id)

        assert result["unreachable"] == 1

    def test_returns_summary_dict(self, contract):
        with patch("soroscan.ingest.tasks.SorobanClient") as MockClient:
            MockClient.return_value.server.get_latest_ledger.return_value = self._mock_ledger(1001)
            result = check_contract_health(contract_id=contract.contract_id)

        assert "total" in result
        assert result["total"] == 1

    def test_skips_inactive_contracts(self, db, user):
        inactive = TrackedContract.objects.create(
            contract_id="CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
            name="Inactive",
            owner=user,
            is_active=False,
        )
        with patch("soroscan.ingest.tasks.SorobanClient"):
            result = check_contract_health(contract_id=inactive.contract_id)
        assert result["total"] == 0


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------

BASE = "/api/ingest/contracts/{}/health/"


@pytest.mark.django_db
class TestHealthCheckAPI:
    def _make_check(self, contract, status="healthy", lag=10):
        return ContractHealthCheck.objects.create(
            contract=contract,
            status=status,
            last_ledger_on_chain=1000 + lag,
            last_indexed_ledger=1000,
            ledger_lag=lag,
            rpc_reachable=status != "unreachable",
            response_time_ms=55.0,
        )

    def test_latest_returns_most_recent(self, anon_client, contract):
        self._make_check(contract, status="healthy", lag=5)
        self._make_check(contract, status="degraded", lag=150)
        url = BASE.format(contract.contract_id)
        resp = anon_client.get(url)
        assert resp.status_code == 200
        assert resp.json()["status"] == "degraded"

    def test_latest_404_when_no_checks(self, anon_client, contract):
        url = BASE.format(contract.contract_id)
        resp = anon_client.get(url)
        assert resp.status_code == 404

    def test_latest_404_for_unknown_contract(self, anon_client):
        url = BASE.format("CNONEXISTENT" + "X" * 44)
        resp = anon_client.get(url)
        assert resp.status_code == 404

    def test_latest_response_shape(self, anon_client, contract):
        self._make_check(contract)
        resp = anon_client.get(BASE.format(contract.contract_id))
        data = resp.json()
        for key in ["contract_id", "status", "ledger_lag", "rpc_reachable",
                    "last_ledger_on_chain", "last_indexed_ledger",
                    "error_detail", "response_time_ms", "checked_at"]:
            assert key in data, f"Missing key: {key}"

    def test_history_returns_all_checks(self, anon_client, contract):
        for i in range(5):
            self._make_check(contract, lag=i * 10)
        url = BASE.format(contract.contract_id) + "history/"
        resp = anon_client.get(url)
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 5
        assert len(data["results"]) == 5

    def test_history_respects_limit(self, anon_client, contract):
        for i in range(10):
            self._make_check(contract)
        url = BASE.format(contract.contract_id) + "history/?limit=3"
        resp = anon_client.get(url)
        assert len(resp.json()["results"]) == 3

    def test_run_requires_auth(self, anon_client, contract):
        url = BASE.format(contract.contract_id) + "run/"
        resp = anon_client.post(url)
        assert resp.status_code in [401, 403]

    def test_run_triggers_check_and_returns_result(self, api_client, contract):
        url = BASE.format(contract.contract_id) + "run/"
        mock_ledger = MagicMock()
        mock_ledger.sequence = 1050
        with patch("soroscan.ingest.tasks.SorobanClient") as MockClient:
            MockClient.return_value.server.get_latest_ledger.return_value = mock_ledger
            resp = api_client.post(url)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "checked_at" in data
        assert ContractHealthCheck.objects.filter(contract=contract).count() == 1
