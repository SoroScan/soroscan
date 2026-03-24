"""
Integration tests for issue #111: Transaction cost tracking and analytics.

Covers:
- TransactionCost model creation and outlier flagging
- extract_transaction_costs helper
- aggregate_transaction_costs Celery task
- CostAnalyticsViewSet endpoints (list, trends, outliers, suggestions)
"""
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from soroscan.ingest.models import (
    CostAggregate,
    TrackedContract,
    TransactionCost,
)
from soroscan.ingest.stellar_client import extract_transaction_costs
from soroscan.ingest.tasks import aggregate_transaction_costs

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def user(db):
    return User.objects.create_user(username="testuser", password="pass")


@pytest.fixture
def contract(db, user):
    return TrackedContract.objects.create(
        contract_id="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
        name="Test Contract",
        owner=user,
    )


@pytest.fixture
def api_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


# ---------------------------------------------------------------------------
# extract_transaction_costs
# ---------------------------------------------------------------------------

class TestExtractTransactionCosts:
    def test_returns_zeros_for_none(self):
        result = extract_transaction_costs(None)
        assert result["total_fee_stroops"] == 0
        assert result["cpu_instructions_used"] == 0
        assert result["memory_bytes_used"] == 0
        assert result["network_bytes_used"] == 0

    def test_extracts_fee_from_fee_charged_attr(self):
        class FakeResponse:
            fee_charged = 12345
            soroban_meta = None

        result = extract_transaction_costs(FakeResponse())
        assert result["total_fee_stroops"] == 12345

    def test_extracts_resources_from_soroban_meta(self):
        class FakeResources:
            instructions = 500_000
            mem_bytes = 1024
            net_bytes = 256

        class FakeMeta:
            resources = FakeResources()

        class FakeResponse:
            fee_charged = 9999
            soroban_meta = FakeMeta()

        result = extract_transaction_costs(FakeResponse())
        assert result["total_fee_stroops"] == 9999
        assert result["cpu_instructions_used"] == 500_000
        assert result["memory_bytes_used"] == 1024
        assert result["network_bytes_used"] == 256

    def test_extracts_from_dict_path(self):
        tx = {
            "tx": {"fee": {"amount": 7777}},
            "result": {
                "result": {
                    "txMeta": {
                        "v3": {
                            "sorobanMeta": {
                                "resources": {
                                    "cpuInstructions": 100,
                                    "memBytes": 200,
                                    "netBytes": 300,
                                }
                            }
                        }
                    }
                }
            },
        }
        result = extract_transaction_costs(tx)
        assert result["total_fee_stroops"] == 7777
        assert result["cpu_instructions_used"] == 100
        assert result["memory_bytes_used"] == 200
        assert result["network_bytes_used"] == 300

    def test_handles_missing_keys_gracefully(self):
        result = extract_transaction_costs({})
        assert result["total_fee_stroops"] == 0


# ---------------------------------------------------------------------------
# TransactionCost model
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestTransactionCostModel:
    def test_create_basic(self, contract):
        tc = TransactionCost.objects.create(
            contract=contract,
            tx_hash="a" * 64,
            function_name="transfer",
            ledger_sequence=1000,
            total_fee_stroops=1_500_000,
            cpu_instructions_used=200_000,
            memory_bytes_used=4096,
            network_bytes_used=512,
        )
        assert tc.pk is not None
        assert tc.is_outlier is False
        assert str(tc).startswith("TxCost(")

    def test_tx_hash_unique(self, contract):
        TransactionCost.objects.create(
            contract=contract,
            tx_hash="b" * 64,
            ledger_sequence=1001,
            total_fee_stroops=100,
        )
        with pytest.raises(Exception):
            TransactionCost.objects.create(
                contract=contract,
                tx_hash="b" * 64,
                ledger_sequence=1002,
                total_fee_stroops=200,
            )


# ---------------------------------------------------------------------------
# aggregate_transaction_costs task
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAggregateTransactionCostsTask:
    def _make_costs(self, contract, function_name, fees):
        for i, fee in enumerate(fees):
            TransactionCost.objects.create(
                contract=contract,
                tx_hash=f"{'c' * 60}{i:04d}",
                function_name=function_name,
                ledger_sequence=2000 + i,
                total_fee_stroops=fee,
            )

    def test_creates_aggregates(self, contract):
        self._make_costs(contract, "transfer", [1_000_000, 1_200_000, 1_100_000])
        result = aggregate_transaction_costs()
        assert result["aggregates_written"] >= 1
        agg = CostAggregate.objects.filter(
            contract=contract, function_name="transfer"
        ).first()
        assert agg is not None
        assert agg.call_count == 3
        assert agg.min_fee_stroops == 1_000_000
        assert agg.max_fee_stroops == 1_200_000

    def test_flags_outliers(self, contract):
        # Normal costs around 1M, one extreme outlier at 10M
        normal = [1_000_000] * 10
        self._make_costs(contract, "swap", normal + [10_000_000])
        aggregate_transaction_costs()
        outliers = TransactionCost.objects.filter(
            contract=contract, function_name="swap", is_outlier=True
        )
        assert outliers.count() >= 1
        assert outliers.first().total_fee_stroops == 10_000_000

    def test_returns_summary_dict(self, contract):
        self._make_costs(contract, "mint", [500_000, 600_000])
        result = aggregate_transaction_costs()
        assert "aggregates_written" in result
        assert "outliers_flagged" in result


# ---------------------------------------------------------------------------
# CostAnalyticsViewSet
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCostAnalyticsViewSet:
    BASE = "/api/analytics/costs/"

    def _make_costs(self, contract, function_name, fees):
        for i, fee in enumerate(fees):
            TransactionCost.objects.create(
                contract=contract,
                tx_hash=f"{'d' * 60}{i:04d}",
                function_name=function_name,
                ledger_sequence=3000 + i,
                total_fee_stroops=fee,
            )

    def test_list_requires_contract_id(self, api_client):
        resp = api_client.get(self.BASE)
        assert resp.status_code == 400

    def test_list_groupby_function(self, api_client, contract):
        self._make_costs(contract, "transfer", [1_000_000, 2_000_000])
        resp = api_client.get(
            self.BASE,
            {"contract_id": contract.contract_id, "groupby": "function", "range": "7d"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        row = data[0]
        assert row["function"] == "transfer"
        assert row["callCount"] == 2
        assert row["minCost"] == 1_000_000
        assert row["maxCost"] == 2_000_000

    def test_list_groupby_hour(self, api_client, contract):
        self._make_costs(contract, "mint", [500_000])
        resp = api_client.get(
            self.BASE,
            {"contract_id": contract.contract_id, "groupby": "hour"},
        )
        assert resp.status_code == 200
        assert "data" in resp.json()

    def test_outliers_endpoint(self, api_client, contract):
        tc = TransactionCost.objects.create(
            contract=contract,
            tx_hash="e" * 64,
            function_name="swap",
            ledger_sequence=4000,
            total_fee_stroops=9_999_999,
            is_outlier=True,
        )
        resp = api_client.get(
            f"{self.BASE}outliers/",
            {"contract_id": contract.contract_id},
        )
        assert resp.status_code == 200
        outliers = resp.json()["outliers"]
        assert len(outliers) == 1
        assert outliers[0]["txHash"] == tc.tx_hash

    def test_trends_endpoint(self, api_client, contract):
        resp = api_client.get(
            f"{self.BASE}trends/",
            {"contract_id": contract.contract_id, "range": "30d"},
        )
        assert resp.status_code == 200
        assert "trends" in resp.json()

    def test_suggestions_endpoint(self, api_client, contract):
        # High variance function
        self._make_costs(contract, "expensive", [100_000, 5_000_000, 3_000_000])
        resp = api_client.get(
            f"{self.BASE}suggestions/",
            {"contract_id": contract.contract_id},
        )
        assert resp.status_code == 200
        assert "suggestions" in resp.json()

    def test_unknown_contract_returns_empty(self, api_client):
        resp = api_client.get(
            self.BASE,
            {"contract_id": "CNONEXISTENT" + "X" * 44, "groupby": "function"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"] == []
