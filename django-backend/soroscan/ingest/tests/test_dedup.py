import json
import hashlib

import pytest
from django.urls import reverse

from soroscan.ingest.models import EventDeduplicationConfig
from soroscan.ingest.tests.factories import TrackedContractFactory, UserFactory


@pytest.mark.django_db
def test_event_dedup_config_save_and_update():
    contract = TrackedContractFactory()

    cfg = EventDeduplicationConfig.objects.create(
        contract=contract, enabled=True, fields=["event_type", "amount", "tx_hash"]
    )

    assert cfg.pk is not None
    assert cfg.enabled is True
    assert cfg.fields == ["event_type", "amount", "tx_hash"]

    # update fields
    cfg.fields = ["event_type", "payload_field"]
    cfg.save()
    cfg.refresh_from_db()
    assert cfg.fields == ["event_type", "payload_field"]


@pytest.mark.django_db
def test_admin_test_endpoint_computes_hash_and_handles_missing_payload(client):
    contract = TrackedContractFactory()
    # create a superuser and login
    admin = UserFactory(is_staff=True, is_superuser=True)
    client.force_login(admin)

    # No dedup config => should report disabled
    url = reverse("admin:soroscan_dedup_test", args=[contract.pk])
    resp = client.post(url, data="{}", content_type="application/json")
    assert resp.status_code == 200
    data = json.loads(resp.content)
    assert data.get("dedup_enabled") is False

    # Create config and test proper hashing
    EventDeduplicationConfig.objects.create(
        contract=contract, enabled=True, fields=["event_type", "ledger", "payload_field"]
    )

    payload = {
        "event_type": "transfer",
        "ledger": 12345,
        "event_index": 0,
        "tx_hash": "deadbeef",
        "payload": {"payload_field": "hello", "other": 1},
    }

    resp = client.post(url, data=json.dumps(payload), content_type="application/json")
    assert resp.status_code == 200
    data = json.loads(resp.content)
    assert "dedup_hash" in data
    assert "material" in data

    # Recompute expected hash using same logic as admin view
    material = {"event_type": payload.get("event_type"), "ledger": payload.get("ledger"), "payload_field": payload.get("payload", {}).get("payload_field")}
    dedup_material = json.dumps(material, sort_keys=True, default=str)
    expected_hash = hashlib.sha256(dedup_material.encode("utf-8")).hexdigest()
    assert data["dedup_hash"] == expected_hash

    # Malformed JSON body should be handled gracefully (admin view falls back to {} payload)
    resp = client.post(url, data="not-json", content_type="application/json")
    assert resp.status_code == 200
    data = json.loads(resp.content)
    assert "dedup_hash" in data
