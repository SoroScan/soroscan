import pytest
from django.utils import timezone

from soroscan.ingest.models import ContractSource, ContractVerification
from soroscan.ingest.schema import schema
from soroscan.ingest.tests.factories import ContractEventFactory, TrackedContractFactory


pytestmark = pytest.mark.django_db


def test_verification_status_is_null_without_a_verification():
    contract = TrackedContractFactory()

    result = schema.execute_sync(
        """
        query($contractId: String!) {
            contract(contractId: $contractId) {
                verificationStatus
            }
        }
        """,
        variable_values={"contractId": contract.contract_id},
    )

    assert result.errors is None
    assert result.data == {"contract": {"verificationStatus": None}}


def test_verification_status_returns_pending_then_latest_verified_status():
    contract = TrackedContractFactory()
    source = ContractSource.objects.create(
        contract=contract,
        source_file="contract_sources/test.rs",
        uploaded_by=contract.owner,
    )
    verification = ContractVerification.objects.create(
        contract=contract,
        source=source,
        status=ContractVerification.Status.PENDING,
        bytecode_hash="a" * 64,
    )
    query = """
        query($contractId: String!) {
            contract(contractId: $contractId) {
                verificationStatus
            }
        }
    """

    pending_result = schema.execute_sync(
        query,
        variable_values={"contractId": contract.contract_id},
    )

    assert pending_result.errors is None
    assert pending_result.data == {"contract": {"verificationStatus": "pending"}}

    verification.status = ContractVerification.Status.VERIFIED
    verification.save(update_fields=["status"])
    verified_result = schema.execute_sync(
        query,
        variable_values={"contractId": contract.contract_id},
    )

    assert verified_result.errors is None
    assert verified_result.data == {"contract": {"verificationStatus": "verified"}}


def test_public_stats_returns_exact_counts_and_public_metrics():
    first_contract = TrackedContractFactory()
    second_contract = TrackedContractFactory()
    ContractEventFactory.create_batch(3, contract=first_contract, timestamp=timezone.now())
    ContractEventFactory(contract=second_contract, timestamp=timezone.now())

    result = schema.execute_sync(
        """
        query {
            publicStats {
                eventsIndexed
                contractsTracked
                avgLatencyMs
                uptimePercentage
            }
        }
        """
    )

    assert result.errors is None
    assert result.data == {
        "publicStats": {
            "eventsIndexed": 4,
            "contractsTracked": 2,
            "avgLatencyMs": 42,
            "uptimePercentage": 99.97,
        }
    }


def test_public_stats_returns_zero_counts_for_empty_database():
    result = schema.execute_sync(
        """
        query {
            publicStats {
                eventsIndexed
                contractsTracked
                avgLatencyMs
                uptimePercentage
            }
        }
        """
    )

    assert result.errors is None
    assert result.data == {
        "publicStats": {
            "eventsIndexed": 0,
            "contractsTracked": 0,
            "avgLatencyMs": 42,
            "uptimePercentage": 99.97,
        }
    }


def test_public_stats_type_exposes_only_public_fields():
    result = schema.execute_sync(
        """
        query {
            __type(name: "PublicStatsType") {
                fields {
                    name
                }
            }
        }
        """
    )

    assert result.errors is None
    assert {field["name"] for field in result.data["__type"]["fields"]} == {
        "eventsIndexed",
        "contractsTracked",
        "avgLatencyMs",
        "uptimePercentage",
    }
