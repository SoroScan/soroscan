import base64

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from soroscan.webhook_verification import verify_webhook_signature


def _generate_ed25519_fixture():
    private_key = Ed25519PrivateKey.generate()
    public_key = base64.b64encode(
        private_key.public_key().public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
    ).decode("ascii")
    return private_key, public_key


def test_sdk_verify_webhook_signature():
    payload = b'{"hello":"world"}'
    private_key, public_key = _generate_ed25519_fixture()
    signature = base64.b64encode(private_key.sign(payload)).decode("ascii")
    assert verify_webhook_signature(payload, f"ed25519={signature}", public_key)


def test_verify_webhook_signature_empty_payload():
    payload = b""
    private_key, public_key = _generate_ed25519_fixture()
    signature = base64.b64encode(private_key.sign(payload)).decode("ascii")
    assert verify_webhook_signature(payload, f"ed25519={signature}", public_key)


def test_verify_webhook_signature_utf8_payload():
    payload = "区块链 Soroban 智能合约测试 🚀".encode("utf-8")
    private_key, public_key = _generate_ed25519_fixture()
    signature = base64.b64encode(private_key.sign(payload)).decode("ascii")
    assert verify_webhook_signature(payload, f"ed25519={signature}", public_key)


def test_verify_webhook_signature_tampered_payload():
    payload = b'{"hello":"world"}'
    private_key, public_key = _generate_ed25519_fixture()
    signature = base64.b64encode(private_key.sign(payload)).decode("ascii")

    # Tampered body must be rejected
    tampered_payload = b'{"hello":"world!"}'
    assert not verify_webhook_signature(tampered_payload, f"ed25519={signature}", public_key)


def test_verify_webhook_signature_corrupted_signature():
    payload = b'{"hello":"world"}'
    private_key, public_key = _generate_ed25519_fixture()
    raw_sig = private_key.sign(payload)
    # Flip the first byte of signature
    corrupted_sig = bytes([raw_sig[0] ^ 0xFF]) + raw_sig[1:]
    sig_b64 = base64.b64encode(corrupted_sig).decode("ascii")

    assert not verify_webhook_signature(payload, f"ed25519={sig_b64}", public_key)


def test_verify_webhook_signature_wrong_key():
    payload = b'{"hello":"world"}'
    priv_key_1, pub_key_1 = _generate_ed25519_fixture()
    _, pub_key_2 = _generate_ed25519_fixture()

    signature = base64.b64encode(priv_key_1.sign(payload)).decode("ascii")
    assert not verify_webhook_signature(payload, f"ed25519={signature}", pub_key_2)


def test_verify_webhook_signature_missing_prefix():
    payload = b'{"hello":"world"}'
    private_key, public_key = _generate_ed25519_fixture()
    signature = base64.b64encode(private_key.sign(payload)).decode("ascii")

    # Missing ed25519= prefix
    assert not verify_webhook_signature(payload, signature, public_key)


def test_verify_webhook_signature_wrong_prefix():
    payload = b'{"hello":"world"}'
    private_key, public_key = _generate_ed25519_fixture()
    signature = base64.b64encode(private_key.sign(payload)).decode("ascii")

    # Unsupported / incorrect prefixes
    assert not verify_webhook_signature(payload, f"sha256={signature}", public_key)
    assert not verify_webhook_signature(payload, f"ED25519={signature}", public_key)
    assert not verify_webhook_signature(payload, f"bearer {signature}", public_key)
    assert not verify_webhook_signature(payload, f"ed25519:{signature}", public_key)


def test_verify_webhook_signature_empty_or_whitespace_header():
    payload = b'{"hello":"world"}'
    _, public_key = _generate_ed25519_fixture()

    assert not verify_webhook_signature(payload, "", public_key)
    assert not verify_webhook_signature(payload, "   ", public_key)
    assert not verify_webhook_signature(payload, "ed25519=", public_key)


def test_verify_webhook_signature_malformed_base64_signature():
    payload = b'{"hello":"world"}'
    _, public_key = _generate_ed25519_fixture()

    assert not verify_webhook_signature(payload, "ed25519=!!!not-base64???", public_key)
    assert not verify_webhook_signature(payload, "ed25519=abc", public_key)


def test_verify_webhook_signature_invalid_signature_length():
    payload = b'{"hello":"world"}'
    _, public_key = _generate_ed25519_fixture()

    # Ed25519 signatures must be 64 bytes; pass 32 bytes
    short_sig = base64.b64encode(b"0" * 32).decode("ascii")
    assert not verify_webhook_signature(payload, f"ed25519={short_sig}", public_key)

    # Pass 128 bytes
    long_sig = base64.b64encode(b"0" * 128).decode("ascii")
    assert not verify_webhook_signature(payload, f"ed25519={long_sig}", public_key)


def test_verify_webhook_signature_malformed_public_key():
    payload = b'{"hello":"world"}'
    private_key, _ = _generate_ed25519_fixture()
    signature = base64.b64encode(private_key.sign(payload)).decode("ascii")
    header = f"ed25519={signature}"

    assert not verify_webhook_signature(payload, header, "")
    assert not verify_webhook_signature(payload, header, "not_valid_b64!!!")


def test_verify_webhook_signature_invalid_public_key_length():
    payload = b'{"hello":"world"}'
    private_key, _ = _generate_ed25519_fixture()
    signature = base64.b64encode(private_key.sign(payload)).decode("ascii")
    header = f"ed25519={signature}"

    # Raw Ed25519 public keys must be 32 bytes; pass 16 or 64 bytes
    short_pub = base64.b64encode(b"0" * 16).decode("ascii")
    assert not verify_webhook_signature(payload, header, short_pub)

    long_pub = base64.b64encode(b"0" * 64).decode("ascii")
    assert not verify_webhook_signature(payload, header, long_pub)
