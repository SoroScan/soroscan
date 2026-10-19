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

    def test_get_contract_verified_reports_verified_and_timestamp(self, api_client):
        from django.utils import timezone
        from soroscan.ingest.models import ContractSource, ContractVerification
        from soroscan.v1.views import _isoformat

        contract = TrackedContractFactory(contract_id=PACT_CONTRACT_ID, name="Verified SDK Contract")
        source = ContractSource.objects.create(contract=contract, uploaded_by=contract.owner)
        verified_time = timezone.now()
        ContractVerification.objects.create(
            contract=contract,
            source=source,
            status=ContractVerification.Status.VERIFIED,
            bytecode_hash="e" * 64,
            verified_at=verified_time,
        )

        response = api_client.get(
            reverse("v1-contract-detail", kwargs={"contract_id": PACT_CONTRACT_ID})
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == PACT_CONTRACT_ID
        assert response.data["verified"] is True
        assert response.data["verifiedAt"] == _isoformat(verified_time)
        assert response.data["wasmHash"] == "e" * 64

    def test_get_contract_unverified_reports_false_and_null(self, api_client):
        TrackedContractFactory(contract_id=PACT_CONTRACT_ID, name="Unverified SDK Contract")

        response = api_client.get(
            reverse("v1-contract-detail", kwargs={"contract_id": PACT_CONTRACT_ID})
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == PACT_CONTRACT_ID
        assert response.data["verified"] is False
        assert response.data["verifiedAt"] is None
        assert response.data["wasmHash"] == ""

    def test_get_contract_failed_verification_reports_false(self, api_client):
        from soroscan.ingest.models import ContractSource, ContractVerification

        contract = TrackedContractFactory(contract_id=PACT_CONTRACT_ID)
        source = ContractSource.objects.create(contract=contract, uploaded_by=contract.owner)
        ContractVerification.objects.create(
            contract=contract,
            source=source,
            status=ContractVerification.Status.FAILED,
            bytecode_hash="f" * 64,
            error_message="Hash mismatch",
        )

        response = api_client.get(
            reverse("v1-contract-detail", kwargs={"contract_id": PACT_CONTRACT_ID})
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["verified"] is False
        assert response.data["verifiedAt"] is None

