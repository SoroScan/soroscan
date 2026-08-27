"""
Live Soroban RPC integration tests — issue #1218.

Runs only when ``SOROBAN_E2E=1`` (set by the soroban-e2e CI workflow).
Requires a deployed contract id in ``SOROSCAN_CONTRACT_ID``.
"""

from __future__ import annotations

import os

import pytest
from django.contrib.auth import get_user_model

from soroscan.ingest.models import ContractEvent, IndexerState, TrackedContract
from soroscan.ingest.tasks import ingest_latest_events

pytestmark = pytest.mark.skipif(
    os.environ.get("SOROBAN_E2E") != "1",
    reason="SOROBAN_E2E not enabled",
)


@pytest.mark.django_db
def test_ingest_live_emitted_events_persist_to_database():
    contract_id = os.environ.get("SOROSCAN_CONTRACT_ID")
    assert contract_id, "SOROSCAN_CONTRACT_ID must be set for Soroban e2e tests"

    user_model = get_user_model()
    user = user_model.objects.create_user(username="soroban-e2e", password="secret")

    contract, _ = TrackedContract.objects.get_or_create(
        contract_id=contract_id,
        defaults={
            "name": "Soroban E2E Contract",
            "owner": user,
            "is_active": True,
        },
    )
    if not contract.is_active:
        contract.is_active = True
        contract.save(update_fields=["is_active"])

    IndexerState.objects.update_or_create(
        key="horizon_cursor",
        defaults={"value": "1"},
    )

    before = ContractEvent.objects.filter(contract=contract).count()
    ingested = ingest_latest_events()
    after = ContractEvent.objects.filter(contract=contract).count()

    assert ingested >= 1 or after > before
    assert ContractEvent.objects.filter(contract=contract).exists()
