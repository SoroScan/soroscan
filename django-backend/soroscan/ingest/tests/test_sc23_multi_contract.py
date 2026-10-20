"""Integration coverage for the SC-23 multi-contract event endpoint."""

import pytest
from django.urls import reverse
from rest_framework import status

from .factories import ContractEventFactory, TrackedContractFactory


@pytest.mark.django_db
class TestEventsByContracts:
    def test_returns_only_requested_contracts_in_ledger_order(self, authenticated_client, user):
        first = TrackedContractFactory(owner=user)
        second = TrackedContractFactory(owner=user)
        excluded = TrackedContractFactory(owner=user)
        ContractEventFactory(contract=first, ledger=20, event_type="transfer")
        ContractEventFactory(contract=second, ledger=10, event_type="transfer")
        ContractEventFactory(contract=excluded, ledger=30, event_type="transfer")

        response = authenticated_client.post(
            reverse("event-by-contracts"),
            {"contract_ids": [first.contract_id, second.contract_id], "ordering": "ledger"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2
        assert [event["ledger"] for event in response.data["results"]] == [10, 20]
        assert response.data["contract_ids"] == [first.contract_id, second.contract_id]

    def test_rejects_empty_and_oversized_contract_lists(self, authenticated_client):
        url = reverse("event-by-contracts")
        assert authenticated_client.post(url, {"contract_ids": []}, format="json").status_code == status.HTTP_400_BAD_REQUEST
        response = authenticated_client.post(url, {"contract_ids": ["C" + "A" * 55] * 11}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    def test_pagination_next_and_previous_links(self, authenticated_client, user):
        """Regression test for Issue #1662: by_contracts populates next/previous links."""
        contract = TrackedContractFactory(owner=user)
        # Create 5 events, with page_size=2 there are 3 pages
        for i in range(5):
            ContractEventFactory(contract=contract, ledger=i + 1, event_type="transfer")

        url = reverse("event-by-contracts")

        # Page 1: next should be populated, previous should be None
        res_p1 = authenticated_client.post(
            url,
            {"contract_ids": [contract.contract_id], "page": 1, "page_size": 2},
            format="json",
        )
        assert res_p1.status_code == status.HTTP_200_OK
        assert res_p1.data["count"] == 5
        assert len(res_p1.data["results"]) == 2
        assert res_p1.data["previous"] is None
        assert res_p1.data["next"] is not None
        assert "page=2" in res_p1.data["next"]
        assert "page_size=2" in res_p1.data["next"]

        # Page 2: both next and previous should be populated
        res_p2 = authenticated_client.post(
            url,
            {"contract_ids": [contract.contract_id], "page": 2, "page_size": 2},
            format="json",
        )
        assert res_p2.status_code == status.HTTP_200_OK
        assert res_p2.data["previous"] is not None
        assert res_p2.data["next"] is not None
        assert "page=3" in res_p2.data["next"]

        # Page 3 (last page): next should be None, previous should be populated
        res_p3 = authenticated_client.post(
            url,
            {"contract_ids": [contract.contract_id], "page": 3, "page_size": 2},
            format="json",
        )
        assert res_p3.status_code == status.HTTP_200_OK
        assert len(res_p3.data["results"]) == 1
        assert res_p3.data["next"] is None
        assert res_p3.data["previous"] is not None

    def test_single_page_has_no_next_or_previous(self, authenticated_client, user):
        contract = TrackedContractFactory(owner=user)
        ContractEventFactory(contract=contract, ledger=1)

        url = reverse("event-by-contracts")
        response = authenticated_client.post(
            url,
            {"contract_ids": [contract.contract_id], "page": 1, "page_size": 10},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["next"] is None
        assert response.data["previous"] is None
