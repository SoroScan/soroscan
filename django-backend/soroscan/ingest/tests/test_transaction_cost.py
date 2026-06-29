from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from soroscan.ingest.models import TrackedContract, TransactionCost
from soroscan.ingest.stellar_client import CostData, SorobanClient
from soroscan.ingest.tasks import analyze_transaction_costs

from .factories import TrackedContractFactory, UserFactory

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def contract(user):
    return TrackedContractFactory(owner=user)


@pytest.mark.django_db
class TestCostExtraction:
    def test_extract_transaction_costs_with_soroban_meta(self):
        client = SorobanClient(
            rpc_url="https://testnet.stellar.org",
            network_passphrase="Test SDF Network ; September 2015",
        )
        tx_response = {
            "result": {
                "result": {
                    "txMeta": {
                        "v3": {
                            "sorobanMeta": {
                                "resources": {
                                    "cpuInstructions": 5000000,
                                    "memBytes": 204800,
                                    "netBytes": 1024,
                                }
                            }
                        }
                    }
                }
            },
            "tx": {"fee": {"amount": 1500000}},
        }

        cost = client.extract_transaction_costs(tx_response)
        assert cost.cpu_instructions == 5000000
        assert cost.memory_bytes == 204800
        assert cost.network_bytes == 1024
        assert cost.total_fee_stroops == 1500000

    def test_extract_transaction_costs_fallback_to_fee(self):
        client = SorobanClient(
            rpc_url="https://testnet.stellar.org",
            network_passphrase="Test SDF Network ; September 2015",
        )
        tx_response = {"status": "SUCCESS", "fee_charged": 100000}

        cost = client.extract_transaction_costs(tx_response)
        assert cost.cpu_instructions == 0
        assert cost.memory_bytes == 0
        assert cost.network_bytes == 0
        assert cost.total_fee_stroops == 100000

    def test_extract_transaction_costs_empty_response(self):
        client = SorobanClient(
            rpc_url="https://testnet.stellar.org",
            network_passphrase="Test SDF Network ; September 2015",
        )
        cost = client.extract_transaction_costs({})
        assert cost.total_fee_stroops == 0
        assert cost.cpu_instructions == 0


@pytest.mark.django_db
class TestTransactionCostModel:
    def test_create_transaction_cost(self, contract):
        cost = TransactionCost.objects.create(
            tx_hash="abc123def456",
            contract=contract,
            function_name="transfer",
            ledger_sequence=123456,
            total_fee_stroops=1500000,
            cpu_instructions_used=5000000,
            memory_bytes_used=204800,
            network_bytes_used=1024,
        )
        assert cost.tx_hash == "abc123def456"
        assert cost.contract == contract
        assert cost.function_name == "transfer"
        assert cost.total_fee_stroops == 1500000
        assert str(cost) == "$1500000 stroops | transfer @ ledger 123456"

    def test_unique_tx_hash_constraint(self, contract):
        TransactionCost.objects.create(
            tx_hash="unique_hash", contract=contract, ledger_sequence=1, total_fee_stroops=100
        )
        with pytest.raises(Exception):
            TransactionCost.objects.create(
                tx_hash="unique_hash", contract=contract, ledger_sequence=2, total_fee_stroops=200
            )


@pytest.mark.django_db
class TestTransactionCostAdmin:
    def test_admin_list_view(self, authenticated_client, contract):
        TransactionCost.objects.create(
            tx_hash="tx1", contract=contract, ledger_sequence=1, total_fee_stroops=100
        )
        TransactionCost.objects.create(
            tx_hash="tx2", contract=contract, ledger_sequence=2, total_fee_stroops=200
        )
        url = reverse("admin:ingest_transactioncost_changelist")
        response = authenticated_client.get(url)
        assert response.status_code in (200, 302)


@pytest.mark.django_db
class TestCostAnalyticsAPI:
    def test_cost_analytics_by_function(self, authenticated_client, contract):
        TransactionCost.objects.create(
            tx_hash="tx1", contract=contract, function_name="transfer",
            ledger_sequence=1, total_fee_stroops=1000,
        )
        TransactionCost.objects.create(
            tx_hash="tx2", contract=contract, function_name="transfer",
            ledger_sequence=2, total_fee_stroops=2000,
        )
        TransactionCost.objects.create(
            tx_hash="tx3", contract=contract, function_name="mint",
            ledger_sequence=3, total_fee_stroops=500,
        )

        url = reverse("cost-analytics-list")
        response = authenticated_client.get(
            url, {"contract_id": contract.contract_id, "groupby": "function"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.data["data"]
        assert len(data) == 2

        transfer_data = next(d for d in data if d["function"] == "transfer")
        assert transfer_data["callCount"] == 2
        assert transfer_data["avgCost"] == 1500.0
        assert transfer_data["totalCost"] == 3000.0

        mint_data = next(d for d in data if d["function"] == "mint")
        assert mint_data["callCount"] == 1
        assert mint_data["totalCost"] == 500.0

    def test_cost_analytics_by_day(self, authenticated_client, contract):
        TransactionCost.objects.create(
            tx_hash="tx1", contract=contract, function_name="transfer",
            ledger_sequence=1, total_fee_stroops=1000,
        )

        url = reverse("cost-analytics-list")
        response = authenticated_client.get(
            url, {"contract_id": contract.contract_id, "groupby": "day"}
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 1

    def test_cost_analytics_contract_not_found(self, authenticated_client):
        url = reverse("cost-analytics-list")
        response = authenticated_client.get(
            url, {"contract_id": "CNONEXISTENT1234567890123456789012345678901234567890123"}
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cost_analytics_invalid_params(self, authenticated_client):
        url = reverse("cost-analytics-list")
        response = authenticated_client.get(url, {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cost_trends(self, authenticated_client, contract):
        TransactionCost.objects.create(
            tx_hash="tx1", contract=contract, function_name="transfer",
            ledger_sequence=1, total_fee_stroops=1000,
        )

        url = reverse("cost-analytics-trends")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "current_7d_total_stroops" in response.data

    def test_cost_suggestions(self, authenticated_client, contract):
        for i in range(10):
            TransactionCost.objects.create(
                tx_hash=f"tx{i}", contract=contract, function_name="transfer",
                ledger_sequence=i, total_fee_stroops=1000 * (i + 1),
            )

        url = reverse("cost-analytics-suggestions")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "suggestions" in response.data


@pytest.mark.django_db
class TestAnalyzeTransactionCostsTask:
    def test_analyze_task_with_no_data(self):
        result = analyze_transaction_costs()
        assert result["contracts_analyzed"] == 0
        assert result["transactions_analyzed"] == 0
        assert result["outliers_flagged"] == 0

    def test_analyze_task_with_data(self, contract):
        TransactionCost.objects.create(
            tx_hash="tx1", contract=contract, function_name="transfer",
            ledger_sequence=1, total_fee_stroops=1000,
        )
        TransactionCost.objects.create(
            tx_hash="tx2", contract=contract, function_name="transfer",
            ledger_sequence=2, total_fee_stroops=2000,
        )
        TransactionCost.objects.create(
            tx_hash="tx3", contract=contract, function_name="mint",
            ledger_sequence=3, total_fee_stroops=500,
        )

        result = analyze_transaction_costs()
        assert result["contracts_analyzed"] >= 1
        assert result["transactions_analyzed"] >= 0

    def test_analyze_task_flags_outliers(self, contract):
        for i in range(20):
            TransactionCost.objects.create(
                tx_hash=f"tx{i}", contract=contract, function_name="transfer",
                ledger_sequence=i, total_fee_stroops=1000,
            )
        TransactionCost.objects.create(
            tx_hash="outlier_tx", contract=contract, function_name="transfer",
            ledger_sequence=99, total_fee_stroops=100000,
        )

        result = analyze_transaction_costs()
        outliers = TransactionCost.objects.filter(contract=contract, is_outlier=True)
        assert outliers.count() >= 1
        assert result["outliers_flagged"] >= 1


@pytest.mark.django_db
class TestGetTransactionCost:
    def test_get_transaction_cost_success(self):
        client = SorobanClient(
            rpc_url="https://testnet.stellar.org",
            network_passphrase="Test SDF Network ; September 2015",
        )
        mock_tx_response = MagicMock()
        mock_tx_response.status = "SUCCESS"
        mock_tx_response.to_dict.return_value = {
            "result": {
                "result": {
                    "txMeta": {
                        "v3": {
                            "sorobanMeta": {
                                "resources": {
                                    "cpuInstructions": 3000000,
                                    "memBytes": 100000,
                                    "netBytes": 512,
                                }
                            }
                        }
                    }
                }
            },
            "tx": {"fee": {"amount": 800000}},
        }

        client.server = MagicMock()
        client.server.get_transaction.return_value = mock_tx_response
        client._rate_limiter = MagicMock()

        cost = client.get_transaction_cost("some_tx_hash")
        assert cost.cpu_instructions == 3000000
        assert cost.memory_bytes == 100000
        assert cost.total_fee_stroops == 800000

    def test_get_transaction_cost_not_found(self):
        client = SorobanClient(
            rpc_url="https://testnet.stellar.org",
            network_passphrase="Test SDF Network ; September 2015",
        )
        mock_tx_response = MagicMock()
        mock_tx_response.status = "NOT_FOUND"

        client.server = MagicMock()
        client.server.get_transaction.return_value = mock_tx_response
        client._rate_limiter = MagicMock()

        cost = client.get_transaction_cost("nonexistent_tx")
        assert cost.total_fee_stroops == 0
        assert cost.cpu_instructions == 0
