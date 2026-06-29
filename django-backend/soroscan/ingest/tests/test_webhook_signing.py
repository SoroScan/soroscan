"""Tests for webhook signing module and SigningKey model."""

import json
from datetime import timedelta

import pytest
from django.utils import timezone

from soroscan.ingest.webhook_signing import (
    generate_signing_key,
    sign_webhook_payload,
    verify_webhook_signature,
    verify_webhook_request,
)


class TestSigningFunctions:
    def test_generate_key_hex_length(self):
        key = generate_signing_key()
        assert len(key) == 64

    def test_generate_key_unique(self):
        keys = {generate_signing_key() for _ in range(100)}
        assert len(keys) == 100

    def test_sign_and_verify_sha256(self):
        key = generate_signing_key()
        payload = '{"event_type": "transfer", "amount": "100"}'
        sig = sign_webhook_payload(payload, key, algorithm="sha256")
        assert sig.startswith("sha256=")
        assert verify_webhook_signature(payload, sig, key) is True

    def test_sign_and_verify_sha1(self):
        key = generate_signing_key()
        payload = '{"event_type": "transfer", "amount": "100"}'
        sig = sign_webhook_payload(payload, key, algorithm="sha1")
        assert sig.startswith("sha1=")
        assert verify_webhook_signature(payload, sig, key) is True

    def test_wrong_key_rejected(self):
        key = generate_signing_key()
        wrong_key = generate_signing_key()
        payload = '{"event_type": "transfer"}'
        sig = sign_webhook_payload(payload, key)
        assert verify_webhook_signature(payload, sig, wrong_key) is False

    def test_tampered_payload_rejected(self):
        key = generate_signing_key()
        payload = '{"event_type": "transfer"}'
        sig = sign_webhook_payload(payload, key)
        assert verify_webhook_signature('{"event_type": "mint"}', sig, key) is False

    def test_tampered_signature_rejected(self):
        key = generate_signing_key()
        payload = '{"event_type": "transfer"}'
        sig = sign_webhook_payload(payload, key)
        bad_sig = "sha256=0000000000000000000000000000000000000000000000000000"
        assert verify_webhook_signature(payload, bad_sig, key) is False

    def test_empty_signature_rejected(self):
        key = generate_signing_key()
        payload = '{"event_type": "transfer"}'
        assert verify_webhook_signature(payload, "", key) is False

    def test_none_signature_rejected(self):
        key = generate_signing_key()
        payload = '{"event_type": "transfer"}'
        assert verify_webhook_signature(payload, None, key) is False

    def test_invalid_format_signature_rejected(self):
        key = generate_signing_key()
        payload = '{"event_type": "transfer"}'
        assert verify_webhook_signature(payload, "not-a-valid-format", key) is False

    def test_verify_webhook_request_bytes(self):
        key = generate_signing_key()
        payload = '{"event": "test"}'
        sig = sign_webhook_payload(payload, key)
        assert verify_webhook_request(payload.encode("utf-8"), sig, key) is True

    def test_verify_webhook_request_no_header(self):
        key = generate_signing_key()
        payload = b'{"event": "test"}'
        assert verify_webhook_request(payload, None, key) is False

    def test_json_payload_with_unicode(self):
        key = generate_signing_key()
        payload = json.dumps({"note": "héllo üñîçödé ✓"}, sort_keys=True)
        sig = sign_webhook_payload(payload, key)
        assert verify_webhook_signature(payload, sig, key) is True


@pytest.mark.django_db
class TestSigningKeyModel:
    def test_create_signing_key(self, webhook_subscription):
        from soroscan.ingest.models import SigningKey
        from soroscan.ingest.webhook_signing import generate_signing_key

        key = SigningKey.objects.create(
            subscription=webhook_subscription,
            key=generate_signing_key(),
            label="test-key",
            expires_at=timezone.now() + timedelta(days=30),
        )
        assert key.is_active is True
        assert str(key).startswith("SigningKey for")
        assert "active" in str(key)

    def test_expired_key_str(self, webhook_subscription):
        from soroscan.ingest.models import SigningKey
        from soroscan.ingest.webhook_signing import generate_signing_key

        key = SigningKey.objects.create(
            subscription=webhook_subscription,
            key=generate_signing_key(),
            label="expired-key",
            expires_at=timezone.now() - timedelta(days=1),
            is_active=False,
        )
        assert "expired" in str(key)

    def test_multiple_keys_per_subscription(self, webhook_subscription):
        from soroscan.ingest.models import SigningKey
        from soroscan.ingest.webhook_signing import generate_signing_key

        for i in range(3):
            SigningKey.objects.create(
                subscription=webhook_subscription,
                key=generate_signing_key(),
                label=f"key-{i}",
                expires_at=timezone.now() + timedelta(days=30),
            )
        assert webhook_subscription.signing_keys.count() == 3


@pytest.mark.django_db
class TestRotateExpiredSigningKeysTask:
    def test_rotate_task_deactivates_expired_keys(self, webhook_subscription):
        from soroscan.ingest.models import SigningKey
        from soroscan.ingest.tasks import rotate_expired_signing_keys
        from soroscan.ingest.webhook_signing import generate_signing_key

        # Create a key that expired 1 day ago (still within 7-day retention)
        key = SigningKey.objects.create(
            subscription=webhook_subscription,
            key=generate_signing_key(),
            label="expired-key",
            expires_at=timezone.now() - timedelta(days=1),
            is_active=True,
        )
        result = rotate_expired_signing_keys()
        key.refresh_from_db()
        assert key.is_active is False
        assert result["deactivated"] == 1

    def test_rotate_task_deletes_very_old_keys(self, webhook_subscription):
        from soroscan.ingest.models import SigningKey
        from soroscan.ingest.tasks import rotate_expired_signing_keys
        from soroscan.ingest.webhook_signing import generate_signing_key

        # Create a key that expired 30 days ago (past retention)
        key = SigningKey.objects.create(
            subscription=webhook_subscription,
            key=generate_signing_key(),
            label="stale-key",
            expires_at=timezone.now() - timedelta(days=30),
            is_active=True,
        )
        result = rotate_expired_signing_keys()
        assert SigningKey.objects.filter(pk=key.pk).exists() is False
        assert result["deleted"] == 1

    def test_rotate_ignores_active_keys(self, webhook_subscription):
        from soroscan.ingest.models import SigningKey
        from soroscan.ingest.tasks import rotate_expired_signing_keys
        from soroscan.ingest.webhook_signing import generate_signing_key

        SigningKey.objects.create(
            subscription=webhook_subscription,
            key=generate_signing_key(),
            label="active-key",
            expires_at=timezone.now() + timedelta(days=30),
            is_active=True,
        )
        result = rotate_expired_signing_keys()
        assert result["deactivated"] == 0
        assert result["deleted"] == 0


@pytest.mark.django_db
class TestWebhookDispatchWithSigningKey:
    def test_dispatch_uses_signing_key_when_available(
        self, webhook_subscription, mocker
    ):
        from soroscan.ingest.models import SigningKey
        from soroscan.ingest.tasks import _build_webhook_signature_header
        from soroscan.ingest.webhook_signing import generate_signing_key

        # Create an active signing key
        signing_key = SigningKey.objects.create(
            subscription=webhook_subscription,
            key=generate_signing_key(),
            label="active-key",
            expires_at=timezone.now() + timedelta(days=30),
            is_active=True,
        )

        payload = b'{"event": "test"}'
        sig = _build_webhook_signature_header(webhook_subscription, payload)

        # Verify the signature with the signing key
        assert verify_webhook_signature(payload.decode(), sig, signing_key.key) is True

    def test_dispatch_falls_back_to_webhook_secret(self, webhook_subscription):
        from soroscan.ingest.tasks import _build_webhook_signature_header

        payload = b'{"event": "test"}'
        sig = _build_webhook_signature_header(webhook_subscription, payload)

        # Verify with the webhook's own secret
        assert verify_webhook_signature(
            payload.decode(), sig, webhook_subscription.secret
        ) is True
