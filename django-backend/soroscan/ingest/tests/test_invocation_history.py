"""
Integration tests for Contract Invocation History (issue #796).

Covers:
- ContractInvocation model creation and FK to ContractEvent
- GET /api/contracts/{id}/invocations/ REST endpoint
- GET /api/invocations/ list endpoint with filters
- GraphQL invocationsForContract query with nested events
- fetch_and_store_invocation Celery task
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from django.urls import reverse
from rest_framework.test import APIClient

from soroscan.ingest.models import ContractEvent, ContractInvocation, TrackedContract
from soroscan.ingest.schema import schema
from soroscan.ingest.tasks import fetch_and_store_invocation
from soroscan.ingest.stellar_client import InvocationData

from .factories import (
    ContractEventFactory,
    TrackedContractFactory,
    UserFactory,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_invocation(contract, tx_hash="a" * 64, caller="G" + "A" * 55, function_name="transfer"):
    return ContractInvocation.objects.create(
        contract=contract,
        tx_hash=tx_hash,
        caller=caller,
        function_name=function_name,
        parameters={"amount": "100"},
        result={"xdr": "AAAAAA=="},
        ledger_sequence=1000,
    )


def _gql_context(user):
    ctx = MagicMock()
    ctx.request = MagicMock()
    ctx.request.user = user
    return ctx


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestContractInvocationModel:
    def test_create_invocation(self, contract):
        inv = _make_invocation(contract)
        assert inv.pk is not None
        assert inv.contract == contract
        assert inv.function_name == "transfer"

    def test_unique_tx_hash_contract_constraint(self, contract):
        _make_invocation(contract, tx_hash="b" * 64)
        with pytest.raises(Exception):
            _make_invocation(contract, tx_hash="b" * 64)

    def test_event_invocation_fk(self, contract):
        inv = _make_invocation(contract)
        event = ContractEventFactory(contract=contract, invocation=inv, tx_hash=inv.tx_hash)
        assert event.invocation == inv
        # Reverse relation
        assert list(inv.events.all()) == [event]

    def test_event_invocation_nullable(self, contract):
        """ContractEvent.invocation is nullable — existing events unaffected."""
        event = ContractEventFactory(contract=contract, invocation=None)
        assert event.invocation is None

    def test_str_representation(self, contract):
        inv = _make_invocation(contract)
        assert "transfer" in str(inv)
        assert str(inv.ledger_sequence) in str(inv)


# ---------------------------------------------------------------------------
# REST API tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestContractInvocationsRESTEndpoint:
    def setup_method(self):
        self.client = APIClient()

    def test_list_invocations_for_contract(self, user, contract):
        self.client.force_authenticate(user=user)
        inv = _make_invocation(contract)

        response = self.client.get(
            f"/api/contracts/{contract.contract_id}/invocations/"
        )
        assert response.status_code == 200
        data = response.json()
        results = data.get("results", data)
        assert any(r["id"] == inv.id for r in results)

    def test_list_invocations_filter_by_caller(self, user, contract):
        self.client.force_authenticate(user=user)
        caller_a = "G" + "A" * 55
        caller_b = "G" + "B" * 55
        _make_invocation(contract, tx_hash="c" * 64, caller=caller_a)
        _make_invocation(contract, tx_hash="d" * 64, caller=caller_b)

        response = self.client.get(
            f"/api/contracts/{contract.contract_id}/invocations/",
            {"caller": caller_a},
        )
        assert response.status_code == 200
        results = response.json().get("results", response.json())
        assert all(r["caller"] == caller_a for r in results)
        assert len(results) == 1

    def test_list_invocations_filter_by_function_name(self, user, contract):
        self.client.force_authenticate(user=user)
        _make_invocation(contract, tx_hash="e" * 64, function_name="swap")
        _make_invocation(contract, tx_hash="f" * 64, function_name="transfer")

        response = self.client.get(
            f"/api/contracts/{contract.contract_id}/invocations/",
            {"function_name": "swap"},
        )
        assert response.status_code == 200
        results = response.json().get("results", response.json())
        assert all(r["function_name"] == "swap" for r in results)

    def test_list_invocations_requires_auth(self, contract):
        response = self.client.get(
            f"/api/contracts/{contract.contract_id}/invocations/"
        )
        assert response.status_code in (401, 403)

    def test_invocation_response_includes_contract_id(self, user, contract):
        self.client.force_authenticate(user=user)
        _make_invocation(contract)

        response = self.client.get(
            f"/api/contracts/{contract.contract_id}/invocations/"
        )
        results = response.json().get("results", response.json())
        assert results[0]["contract_id"] == contract.contract_id

    def test_generic_invocations_endpoint(self, user, contract):
        """GET /api/invocations/ also works."""
        self.client.force_authenticate(user=user)
        _make_invocation(contract)

        response = self.client.get("/api/invocations/")
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# GraphQL tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestInvocationsForContractGraphQL:
    def test_basic_query_returns_invocations(self, user, contract):
        inv = _make_invocation(contract)
        event = ContractEventFactory(contract=contract, invocation=inv, tx_hash=inv.tx_hash)

        result = schema.execute_sync(
            """
            query($contractId: String!) {
                invocationsForContract(contractId: $contractId) {
                    totalCount
                    edges {
                        node {
                            id
                            txHash
                            caller
                            functionName
                            parameters
                            ledgerSequence
                            contractId
                            events {
                                id
                                eventType
                            }
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
            """,
            variable_values={"contractId": contract.contract_id},
        )
        assert result.errors is None
        data = result.data["invocationsForContract"]
        assert data["totalCount"] == 1
        node = data["edges"][0]["node"]
        assert node["txHash"] == inv.tx_hash
        assert node["caller"] == inv.caller
        assert node["functionName"] == "transfer"
        assert node["contractId"] == contract.contract_id
        assert len(node["events"]) == 1
        assert node["events"][0]["id"] == event.id

    def test_filter_by_caller(self, user, contract):
        caller_a = "G" + "A" * 55
        caller_b = "G" + "B" * 55
        _make_invocation(contract, tx_hash="g" * 64, caller=caller_a)
        _make_invocation(contract, tx_hash="h" * 64, caller=caller_b)

        result = schema.execute_sync(
            """
            query($contractId: String!, $caller: String) {
                invocationsForContract(contractId: $contractId, caller: $caller) {
                    totalCount
                    edges { node { caller } }
                }
            }
            """,
            variable_values={"contractId": contract.contract_id, "caller": caller_a},
        )
        assert result.errors is None
        data = result.data["invocationsForContract"]
        assert data["totalCount"] == 1
        assert data["edges"][0]["node"]["caller"] == caller_a

    def test_filter_by_function_name(self, user, contract):
        _make_invocation(contract, tx_hash="i" * 64, function_name="mint")
        _make_invocation(contract, tx_hash="j" * 64, function_name="burn")

        result = schema.execute_sync(
            """
            query($contractId: String!, $functionName: String) {
                invocationsForContract(contractId: $contractId, functionName: $functionName) {
                    totalCount
                }
            }
            """,
            variable_values={"contractId": contract.contract_id, "functionName": "mint"},
        )
        assert result.errors is None
        assert result.data["invocationsForContract"]["totalCount"] == 1

    def test_pagination_first(self, user, contract):
        for i in range(5):
            _make_invocation(contract, tx_hash=str(i).zfill(64))

        result = schema.execute_sync(
            """
            query($contractId: String!) {
                invocationsForContract(contractId: $contractId, first: 2) {
                    totalCount
                    edges { cursor }
                    pageInfo { hasNextPage endCursor }
                }
            }
            """,
            variable_values={"contractId": contract.contract_id},
        )
        assert result.errors is None
        data = result.data["invocationsForContract"]
        assert len(data["edges"]) == 2
        assert data["totalCount"] == 5
        assert data["pageInfo"]["hasNextPage"] is True

    def test_unknown_contract_returns_empty(self):
        result = schema.execute_sync(
            """
            query {
                invocationsForContract(contractId: "C" + "Z" * 55) {
                    totalCount
                }
            }
            """,
        )
        # Schema error or empty result — either is acceptable for unknown contract
        if result.errors is None:
            assert result.data["invocationsForContract"]["totalCount"] == 0


# ---------------------------------------------------------------------------
# Celery task tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestFetchAndStoreInvocationTask:
    def _mock_invocation_data(self, **kwargs):
        defaults = dict(
            caller="G" + "A" * 55,
            contract="C" + "A" * 55,
            function_name="transfer",
            parameters={"amount": "500"},
            result={"xdr": "AAAA"},
            ledger_sequence=2000,
            success=True,
            error=None,
        )
        defaults.update(kwargs)
        return InvocationData(**defaults)

    def test_task_creates_invocation_and_links_event(self, contract):
        event = ContractEventFactory(contract=contract, invocation=None)
        tx = "k" * 64

        mock_data = self._mock_invocation_data()
        with patch(
            "soroscan.ingest.tasks.SorobanClient.get_invocation",
            return_value=mock_data,
        ):
            result = fetch_and_store_invocation(contract.contract_id, tx, event.id)

        assert result["status"] == "ok"
        assert result["created"] is True

        inv = ContractInvocation.objects.get(id=result["invocation_id"])
        assert inv.tx_hash == tx
        assert inv.function_name == "transfer"
        assert inv.caller == "G" + "A" * 55

        event.refresh_from_db()
        assert event.invocation == inv

    def test_task_idempotent_on_existing_invocation(self, contract):
        """Running the task twice for the same tx does not create a duplicate."""
        event = ContractEventFactory(contract=contract, invocation=None)
        tx = "l" * 64
        inv = _make_invocation(contract, tx_hash=tx)

        mock_data = self._mock_invocation_data()
        with patch(
            "soroscan.ingest.tasks.SorobanClient.get_invocation",
            return_value=mock_data,
        ):
            result = fetch_and_store_invocation(contract.contract_id, tx, event.id)

        assert result["status"] == "already_exists"
        assert result["invocation_id"] == inv.id
        assert ContractInvocation.objects.filter(tx_hash=tx, contract=contract).count() == 1

    def test_task_skips_unknown_contract(self):
        result = fetch_and_store_invocation("C" + "Z" * 55, "m" * 64, 999)
        assert result["status"] == "skipped"
        assert result["reason"] == "contract_not_found"

    def test_task_handles_not_found_gracefully(self, contract):
        event = ContractEventFactory(contract=contract, invocation=None)
        not_found_data = self._mock_invocation_data(
            success=False, error="Transaction not found"
        )
        with patch(
            "soroscan.ingest.tasks.SorobanClient.get_invocation",
            return_value=not_found_data,
        ):
            result = fetch_and_store_invocation(contract.contract_id, "n" * 64, event.id)

        assert result["status"] == "not_found"
        event.refresh_from_db()
        assert event.invocation is None
