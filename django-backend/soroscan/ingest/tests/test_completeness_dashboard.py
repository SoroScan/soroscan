"""Tests for ``TrackedContractViewSet.completeness_dashboard``.

Covers the six required behaviours of
``GET /api/ingest/contracts/completeness_dashboard/``:

1. stored ``IndexerState`` JSON is preferred over recalculation,
2. missing state falls back to ``_calculate_completeness``,
3. corrupt JSON falls back cleanly (no 500),
4. rows are sorted by ``completeness_percentage`` ascending,
5. contracts owned by other users are excluded,
6. a user with no tracked contracts receives ``{"contracts": []}``.
"""

import json
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from soroscan.ingest.models import IndexerState

from .factories import ContractEventFactory, TrackedContractFactory, UserFactory

DASHBOARD_URL_NAME = "contract-completeness-dashboard"


def _stored_payload(percentage, **overrides):
    """Build a completeness payload shaped like ``_calculate_completeness`` output."""
    payload = {
        "contract_id": "STORED",
        "completeness_percentage": percentage,
        "observed_ledgers": 1,
        "expected_ledgers": 2,
        "missing_ledgers": 1,
        "gaps": [],
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
class TestCompletenessDashboard:
    def test_prefers_stored_indexer_state_over_recalculation(
        self, authenticated_client, user
    ):
        contract = TrackedContractFactory(owner=user)
        stored = _stored_payload(
            42.5, contract_id=contract.contract_id, source="stored"
        )
        IndexerState.objects.create(
            key=f"completeness:{contract.id}", value=json.dumps(stored)
        )
        # Events present that would compute a different value if recalculated.
        ContractEventFactory(contract=contract, ledger=10, event_index=0)

        with patch("soroscan.ingest.tasks._calculate_completeness") as mock_calc:
            response = authenticated_client.get(reverse(DASHBOARD_URL_NAME))

        assert response.status_code == status.HTTP_200_OK
        assert response.data["contracts"] == [stored]
        mock_calc.assert_not_called()

    def test_falls_back_to_calculation_when_state_missing(
        self, authenticated_client, user
    ):
        contract = TrackedContractFactory(owner=user)
        ContractEventFactory(contract=contract, ledger=100, event_index=0)
        ContractEventFactory(contract=contract, ledger=102, event_index=0)

        assert not IndexerState.objects.filter(
            key=f"completeness:{contract.id}"
        ).exists()

        response = authenticated_client.get(reverse(DASHBOARD_URL_NAME))

        assert response.status_code == status.HTTP_200_OK
        row = response.data["contracts"][0]
        assert row["contract_id"] == contract.contract_id
        assert row["missing_ledgers"] == 1
        assert row["completeness_percentage"] < 100.0

    def test_falls_back_when_state_json_is_corrupt(
        self, authenticated_client, user
    ):
        contract = TrackedContractFactory(owner=user)
        IndexerState.objects.create(
            key=f"completeness:{contract.id}", value="{not-valid-json"
        )
        ContractEventFactory(contract=contract, ledger=100, event_index=0)
        ContractEventFactory(contract=contract, ledger=102, event_index=0)

        response = authenticated_client.get(reverse(DASHBOARD_URL_NAME))

        assert response.status_code == status.HTTP_200_OK
        row = response.data["contracts"][0]
        assert row["contract_id"] == contract.contract_id
        assert row["missing_ledgers"] == 1
        assert row["completeness_percentage"] < 100.0

    def test_sorts_contracts_by_completeness_ascending(
        self, authenticated_client, user
    ):
        high = TrackedContractFactory(owner=user)
        low = TrackedContractFactory(owner=user)
        mid = TrackedContractFactory(owner=user)
        for contract, percentage in ((high, 90.0), (low, 10.0), (mid, 50.0)):
            IndexerState.objects.create(
                key=f"completeness:{contract.id}",
                value=json.dumps(
                    _stored_payload(percentage, contract_id=contract.contract_id)
                ),
            )

        response = authenticated_client.get(reverse(DASHBOARD_URL_NAME))

        percentages = [
            row["completeness_percentage"] for row in response.data["contracts"]
        ]
        assert percentages == [10.0, 50.0, 90.0]

    def test_excludes_contracts_owned_by_other_users(
        self, authenticated_client, user
    ):
        mine = TrackedContractFactory(owner=user)
        other_user = UserFactory()
        theirs = TrackedContractFactory(owner=other_user)

        response = authenticated_client.get(reverse(DASHBOARD_URL_NAME))

        contract_ids = {row["contract_id"] for row in response.data["contracts"]}
        assert contract_ids == {mine.contract_id}
        assert theirs.contract_id not in contract_ids

    def test_returns_empty_list_when_user_has_no_contracts(self, authenticated_client):
        response = authenticated_client.get(reverse(DASHBOARD_URL_NAME))

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {"contracts": []}
