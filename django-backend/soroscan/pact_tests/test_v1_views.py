"""Unit tests for the public v1 API shim used by Pact contracts."""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from soroscan.ingest.tests.factories import ContractEventFactory, TrackedContractFactory
from soroscan.pact_provider import PACT_CONTRACT_ID


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestV1ApiViews:
    def test_list_events_returns_sdk_shape(self, api_client):
        contract = TrackedContractFactory(contract_id=PACT_CONTRACT_ID)
        ContractEventFactory(contract=contract, event_type="transfer")

        response = api_client.get(reverse("v1-events"), {"first": 5})

        assert response.status_code == status.HTTP_200_OK
        assert "items" in response.data
        assert "pageInfo" in response.data
        assert "totalCount" in response.data
        assert response.data["totalCount"] >= 1
        assert response.data["items"][0]["type"] == "transfer"

    def test_get_contract_returns_sdk_shape(self, api_client):
        TrackedContractFactory(contract_id=PACT_CONTRACT_ID, name="SDK Contract")

        response = api_client.get(
            reverse("v1-contract-detail", kwargs={"contract_id": PACT_CONTRACT_ID})
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == PACT_CONTRACT_ID
        assert response.data["label"] == "SDK Contract"

    def test_get_contract_not_found(self, api_client):
        missing_id = "C" + "B" * 55
        response = api_client.get(
            reverse("v1-contract-detail", kwargs={"contract_id": missing_id})
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_list_events_after_cursor_pagination(self, api_client):
        from django.utils import timezone
        from datetime import timedelta

        contract = TrackedContractFactory(contract_id=PACT_CONTRACT_ID)
        now = timezone.now()
        # Create 4 events: e1 (oldest) to e4 (newest)
        e1 = ContractEventFactory(contract=contract, ledger=100, event_index=0, timestamp=now - timedelta(seconds=40))
        e2 = ContractEventFactory(contract=contract, ledger=101, event_index=0, timestamp=now - timedelta(seconds=30))
        e3 = ContractEventFactory(contract=contract, ledger=102, event_index=0, timestamp=now - timedelta(seconds=20))
        e4 = ContractEventFactory(contract=contract, ledger=103, event_index=0, timestamp=now - timedelta(seconds=10))

        # Page 1: first 2 items (e4, e3)
        res1 = api_client.get(reverse("v1-events"), {"contractId": PACT_CONTRACT_ID, "first": 2})
        assert res1.status_code == status.HTTP_200_OK
        assert len(res1.data["items"]) == 2
        assert res1.data["items"][0]["id"] == str(e4.id)
        assert res1.data["items"][1]["id"] == str(e3.id)
        assert res1.data["pageInfo"]["hasNextPage"] is True
        assert res1.data["pageInfo"]["hasPreviousPage"] is False
        end_cursor = res1.data["pageInfo"]["endCursor"]
        assert end_cursor == f"{e3.ledger}-{e3.event_index}"

        # Page 2: next 2 items (e2, e1) after end_cursor
        res2 = api_client.get(reverse("v1-events"), {"contractId": PACT_CONTRACT_ID, "first": 2, "after": end_cursor})
        assert res2.status_code == status.HTTP_200_OK
        assert len(res2.data["items"]) == 2
        assert res2.data["items"][0]["id"] == str(e2.id)
        assert res2.data["items"][1]["id"] == str(e1.id)
        assert res2.data["pageInfo"]["hasNextPage"] is False
        assert res2.data["pageInfo"]["hasPreviousPage"] is True

        # Page 3: after e1 (no more items)
        res3 = api_client.get(reverse("v1-events"), {"contractId": PACT_CONTRACT_ID, "first": 2, "after": res2.data["pageInfo"]["endCursor"]})
        assert res3.status_code == status.HTTP_200_OK
        assert len(res3.data["items"]) == 0
        assert res3.data["pageInfo"]["hasNextPage"] is False
        assert res3.data["pageInfo"]["hasPreviousPage"] is True

    def test_list_events_before_cursor(self, api_client):
        from django.utils import timezone
        from datetime import timedelta

        contract = TrackedContractFactory(contract_id=PACT_CONTRACT_ID)
        now = timezone.now()
        e1 = ContractEventFactory(contract=contract, ledger=200, event_index=0, timestamp=now - timedelta(seconds=30))
        e2 = ContractEventFactory(contract=contract, ledger=201, event_index=0, timestamp=now - timedelta(seconds=20))
        e3 = ContractEventFactory(contract=contract, ledger=202, event_index=0, timestamp=now - timedelta(seconds=10))

        # Before e1 in descending order should return e3, e2
        res = api_client.get(reverse("v1-events"), {"contractId": PACT_CONTRACT_ID, "first": 2, "before": f"{e1.ledger}-{e1.event_index}"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["items"]) == 2
        assert res.data["items"][0]["id"] == str(e3.id)
        assert res.data["items"][1]["id"] == str(e2.id)
        assert res.data["pageInfo"]["hasNextPage"] is True

    def test_list_events_invalid_cursor_returns_empty_gracefully(self, api_client):
        res = api_client.get(reverse("v1-events"), {"after": "999999-99"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["items"] == []
        assert res.data["pageInfo"]["hasNextPage"] is False
        assert res.data["pageInfo"]["hasPreviousPage"] is False

