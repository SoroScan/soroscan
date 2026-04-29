"""
Tests for the four new features:
  1. import_contracts management command
  2. GET /api/webhooks/schema/ endpoint
  3. BlacklistedContract model and ingestion skip
  4. ?type= filter on ContractEventViewSet
"""
import json
import tempfile
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from rest_framework.test import APIClient

from soroscan.ingest.models import BlacklistedContract, ContractEvent, TrackedContract
from soroscan.ingest.tests.factories import (
    ContractEventFactory,
    TrackedContractFactory,
    UserFactory,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Feature 1: import_contracts management command
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestImportContractsCommand:
    def test_imports_contracts_from_json_list(self):
        user = UserFactory()
        contracts_data = [
            {"address": "C" + "A" * 55, "name": "Contract A"},
            {"address": "C" + "B" * 55, "name": "Contract B"},
        ]

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(contracts_data, f)
            f.flush()

            call_command("import_contracts", file=f.name, owner=user.username)

        assert TrackedContract.objects.filter(contract_id="C" + "A" * 55).exists()
        assert TrackedContract.objects.filter(contract_id="C" + "B" * 55).exists()
        assert TrackedContract.objects.count() == 2

    def test_imports_contracts_from_json_object(self):
        user = UserFactory()
        contracts_data = {
            "contracts": [
                {"address": "C" + "C" * 55, "name": "Contract C"},
                {"address": "C" + "D" * 55, "name": "Contract D"},
            ]
        }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(contracts_data, f)
            f.flush()

            call_command("import_contracts", file=f.name, owner=user.username)

        assert TrackedContract.objects.filter(contract_id="C" + "C" * 55).exists()
        assert TrackedContract.objects.filter(contract_id="C" + "D" * 55).exists()

    def test_skips_duplicate_contracts(self):
        user = UserFactory()
        existing = TrackedContractFactory(contract_id="C" + "E" * 55, owner=user)

        contracts_data = [
            {"address": "C" + "E" * 55, "name": "Duplicate"},
            {"address": "C" + "F" * 55, "name": "New Contract"},
        ]

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(contracts_data, f)
            f.flush()

            call_command("import_contracts", file=f.name, owner=user.username)

        assert TrackedContract.objects.count() == 2
        assert TrackedContract.objects.filter(contract_id="C" + "F" * 55).exists()

    def test_handles_missing_file(self):
        with pytest.raises(CommandError, match="File not found"):
            call_command("import_contracts", file="/nonexistent.json")

    def test_handles_invalid_json(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            f.write("not valid json{")
            f.flush()

            with pytest.raises(CommandError, match="Invalid JSON"):
                call_command("import_contracts", file=f.name)

    def test_uses_first_superuser_when_no_owner_specified(self):
        superuser = UserFactory(is_superuser=True)
        contracts_data = [{"address": "C" + "G" * 55, "name": "Contract G"}]

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(contracts_data, f)
            f.flush()

            call_command("import_contracts", file=f.name)

        contract = TrackedContract.objects.get(contract_id="C" + "G" * 55)
        assert contract.owner == superuser


# ---------------------------------------------------------------------------
# Feature 2: GET /api/webhooks/schema/ endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestWebhookSchemaEndpoint:
    def test_returns_json_schema(self):
        client = APIClient()
        response = client.get("/api/ingest/webhooks/schema/")

        assert response.status_code == 200
        schema = response.json()
        assert schema["$schema"] == "http://json-schema.org/draft-07/schema#"
        assert schema["title"] == "SoroScan Webhook Event Payload"
        assert "properties" in schema
        assert "contract_id" in schema["properties"]
        assert "event_type" in schema["properties"]
        assert "ledger" in schema["properties"]
        assert "payload" in schema["properties"]

    def test_schema_has_required_fields(self):
        client = APIClient()
        response = client.get("/api/ingest/webhooks/schema/")

        schema = response.json()
        assert "required" in schema
        assert "contract_id" in schema["required"]
        assert "event_type" in schema["required"]
        assert "ledger" in schema["required"]
        assert "timestamp" in schema["required"]
        assert "payload" in schema["required"]

    def test_schema_describes_contract_id_pattern(self):
        client = APIClient()
        response = client.get("/api/ingest/webhooks/schema/")

        schema = response.json()
        contract_id_prop = schema["properties"]["contract_id"]
        assert contract_id_prop["type"] == "string"
        assert "pattern" in contract_id_prop
        assert contract_id_prop["pattern"] == "^C[A-Z2-7]{55}$"


# ---------------------------------------------------------------------------
# Feature 3: BlacklistedContract model and ingestion skip
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBlacklistedContract:
    def test_model_creation(self):
        blacklisted = BlacklistedContract.objects.create(
            contract_id="C" + "X" * 55,
            reason="Spam contract",
        )
        assert blacklisted.contract_id == "C" + "X" * 55
        assert blacklisted.reason == "Spam contract"
        assert blacklisted.created_at is not None

    def test_unique_constraint(self):
        BlacklistedContract.objects.create(contract_id="C" + "Y" * 55)
        with pytest.raises(Exception):  # IntegrityError
            BlacklistedContract.objects.create(contract_id="C" + "Y" * 55)

    @patch("stellar_sdk.SorobanServer")
    def test_ingestion_skips_blacklisted_contracts(self, mock_server_class):
        """Test that blacklisted contracts are skipped during ingestion."""
        from soroscan.ingest.tasks import ingest_latest_events

        # Create a tracked contract and blacklist it
        contract = TrackedContractFactory(contract_id="C" + "Z" * 55)
        BlacklistedContract.objects.create(contract_id=contract.contract_id)

        # Mock the SorobanServer to return an event for the blacklisted contract
        mock_event = MagicMock()
        mock_event.contract_id = contract.contract_id
        mock_event.type = "transfer"
        mock_event.value = {"amount": 100}
        mock_event.ledger = 1000
        mock_event.tx_hash = "abc123"

        mock_response = MagicMock()
        mock_response.events = [mock_event]
        mock_response.cursor = "1000"

        mock_server = MagicMock()
        mock_server.get_events.return_value = mock_response
        mock_server_class.return_value = mock_server

        ingest_latest_events()

        # Verify no events were created for the blacklisted contract
        assert ContractEvent.objects.filter(contract=contract).count() == 0


# ---------------------------------------------------------------------------
# Feature 4: ?type= filter on ContractEventViewSet
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestEventTypeFilter:
    def test_filters_by_single_type(self):
        user = UserFactory()
        contract = TrackedContractFactory(owner=user)
        ContractEventFactory(contract=contract, event_type="transfer")
        ContractEventFactory(contract=contract, event_type="swap")
        ContractEventFactory(contract=contract, event_type="burn")

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get("/api/ingest/events/?type=transfer")

        assert response.status_code == 200
        results = response.json()["results"]
        assert len(results) == 1
        assert results[0]["event_type"] == "transfer"

    def test_filters_by_multiple_types(self):
        user = UserFactory()
        contract = TrackedContractFactory(owner=user)
        ContractEventFactory(contract=contract, event_type="transfer")
        ContractEventFactory(contract=contract, event_type="swap")
        ContractEventFactory(contract=contract, event_type="burn")
        ContractEventFactory(contract=contract, event_type="mint")

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get("/api/ingest/events/?type=transfer,burn")

        assert response.status_code == 200
        results = response.json()["results"]
        assert len(results) == 2
        event_types = {r["event_type"] for r in results}
        assert event_types == {"transfer", "burn"}

    def test_returns_empty_list_when_no_matches(self):
        user = UserFactory()
        contract = TrackedContractFactory(owner=user)
        ContractEventFactory(contract=contract, event_type="transfer")

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get("/api/ingest/events/?type=nonexistent")

        assert response.status_code == 200
        results = response.json()["results"]
        assert len(results) == 0

    def test_ignores_empty_type_parameter(self):
        user = UserFactory()
        contract = TrackedContractFactory(owner=user)
        ContractEventFactory(contract=contract, event_type="transfer")
        ContractEventFactory(contract=contract, event_type="swap")

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get("/api/ingest/events/?type=")

        assert response.status_code == 200
        results = response.json()["results"]
        assert len(results) == 2

    def test_handles_whitespace_in_type_list(self):
        user = UserFactory()
        contract = TrackedContractFactory(owner=user)
        ContractEventFactory(contract=contract, event_type="transfer")
        ContractEventFactory(contract=contract, event_type="swap")

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get("/api/ingest/events/?type=transfer, swap")

        assert response.status_code == 200
        results = response.json()["results"]
        assert len(results) == 2
