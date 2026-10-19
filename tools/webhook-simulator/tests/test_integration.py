from __future__ import annotations

import base64
import hashlib
import hmac
import http.server
import json
import socketserver
import threading
from typing import Any
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from webhook_simulator.cli import main
from webhook_simulator.delivery import deliver
from webhook_simulator.payload import SAMPLE_EVENT, canonicalize, normalize_event
from webhook_simulator.signing import (
    HMAC_SHA256,
    build_delivery_headers,
)


class WebhookBackendHandler(http.server.BaseHTTPRequestHandler):
    """Test HTTP backend verifying signatures according to SoroScan webhook spec."""

    server: WebhookTestServer

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        # 1. Check HMAC signature if configured
        hmac_header = self.headers.get("X-SoroScan-Signature")
        if self.server.expected_secret:
            if not hmac_header or "=" not in hmac_header:
                self.send_response(401)
                self.end_headers()
                self.wfile.write(b'{"error": "missing or malformed hmac signature"}')
                return

            algo, sig = hmac_header.split("=", 1)
            digestmod = hashlib.sha1 if algo == "sha1" else hashlib.sha256
            expected = hmac.new(
                self.server.expected_secret.encode("utf-8"),
                msg=body,
                digestmod=digestmod,
            ).hexdigest()

            if not hmac.compare_digest(sig, expected):
                self.send_response(403)
                self.end_headers()
                self.wfile.write(b'{"error": "hmac signature mismatch"}')
                return

        # 2. Check Ed25519 signature if configured
        ed25519_header = self.headers.get("X-Signature")
        if self.server.expected_ed25519_seed:
            if not ed25519_header or not ed25519_header.startswith("ed25519="):
                self.send_response(401)
                self.end_headers()
                self.wfile.write(b'{"error": "missing or malformed ed25519 signature"}')
                return

            sig_b64 = ed25519_header[len("ed25519=") :]
            try:
                sig_raw = base64.b64decode(sig_b64)
                seed_bytes = bytes.fromhex(self.server.expected_ed25519_seed)
                pubkey = Ed25519PrivateKey.from_private_bytes(seed_bytes).public_key()
                pubkey.verify(sig_raw, body)
            except Exception:
                self.send_response(403)
                self.end_headers()
                self.wfile.write(b'{"error": "ed25519 signature verification failed"}')
                return

        # 3. Accepted & acknowledged
        self.server.received_deliveries.append(
            {
                "headers": dict(self.headers),
                "body": body,
                "json": json.loads(body.decode("utf-8")),
            }
        )

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("X-SoroScan-Ack", "ok")
        self.end_headers()
        self.wfile.write(b'{"status": "delivered", "ack": "ok"}')

    def log_message(self, format, *args):
        # Silence stdio output in tests
        pass


class WebhookTestServer(socketserver.TCPServer):
    allow_reuse_address = True

    def __init__(
        self,
        server_address,
        RequestHandlerClass,
        expected_secret: str | None = None,
        expected_ed25519_seed: str | None = None,
    ):
        super().__init__(server_address, RequestHandlerClass)
        self.expected_secret = expected_secret
        self.expected_ed25519_seed = expected_ed25519_seed
        self.received_deliveries: list[dict[str, Any]] = []


@pytest.fixture
def run_backend():
    """Context helper to spin up an in-process HTTP backend on a free port."""
    servers: list[WebhookTestServer] = []

    def _start(secret: str | None = None, ed25519_seed: str | None = None) -> WebhookTestServer:
        server = WebhookTestServer(
            ("127.0.0.1", 0),
            WebhookBackendHandler,
            expected_secret=secret,
            expected_ed25519_seed=ed25519_seed,
        )
        servers.append(server)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        return server

    yield _start

    for s in servers:
        s.shutdown()
        s.server_close()


def test_cli_e2e_hmac_sha256_accepted(run_backend, capsys):
    secret = "production-webhook-secret-9988"
    server = run_backend(secret=secret)
    host, port = server.server_address
    url = f"http://{host}:{port}/api/webhooks/ingest/"

    code = main(
        [
            "--url",
            url,
            "--sample",
            "--secret",
            secret,
            "--output",
            "json",
        ]
    )

    assert code == 0
    out = json.loads(capsys.readouterr().out)
    assert out["success"] is True
    assert out["status"] == "success"
    assert out["http_status"] == 200
    assert out["ack_status"] == "valid"

    assert len(server.received_deliveries) == 1
    received = server.received_deliveries[0]
    assert received["json"]["event_type"] == SAMPLE_EVENT["event_type"]
    assert received["headers"]["X-SoroScan-Signature"].startswith("sha256=")


def test_cli_e2e_ed25519_signature_accepted(run_backend, capsys):
    ed25519_seed = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    server = run_backend(ed25519_seed=ed25519_seed)
    host, port = server.server_address
    url = f"http://{host}:{port}/webhook"

    code = main(
        [
            "--url",
            url,
            "--sample",
            "--ed25519-seed",
            ed25519_seed,
            "--unsigned",
            "--output",
            "json",
        ]
    )

    assert code == 0
    out = json.loads(capsys.readouterr().out)
    assert out["success"] is True
    assert out["http_status"] == 200
    assert len(server.received_deliveries) == 1
    assert "X-Signature" in server.received_deliveries[0]["headers"]


def test_cli_e2e_signature_mismatch_rejected(run_backend, capsys):
    server = run_backend(secret="correct-secret")
    host, port = server.server_address
    url = f"http://{host}:{port}/webhook"

    code = main(
        [
            "--url",
            url,
            "--sample",
            "--secret",
            "wrong-attacker-secret",
            "--output",
            "json",
        ]
    )

    assert code == 1
    out = json.loads(capsys.readouterr().out)
    assert out["success"] is False
    assert out["http_status"] == 403
    assert len(server.received_deliveries) == 0


def test_cli_e2e_missing_signature_rejected(run_backend, capsys):
    server = run_backend(secret="must-have-secret")
    host, port = server.server_address
    url = f"http://{host}:{port}/webhook"

    code = main(
        [
            "--url",
            url,
            "--sample",
            "--unsigned",
            "--output",
            "json",
        ]
    )

    assert code == 1
    out = json.loads(capsys.readouterr().out)
    assert out["success"] is False
    assert out["http_status"] == 401
    assert len(server.received_deliveries) == 0


def test_delivery_tampered_payload_rejected(run_backend):
    secret = "tamper-proof-secret"
    server = run_backend(secret=secret)
    host, port = server.server_address
    url = f"http://{host}:{port}/webhook"

    event = normalize_event({"amount": 100})
    payload_bytes = canonicalize(event)

    # Generate headers for original bytes
    headers = build_delivery_headers(
        payload_bytes,
        secret=secret,
        algorithm=HMAC_SHA256,
        timestamp="2026-10-20T07:00:00Z",
    )

    # Tamper payload during transit
    tampered_bytes = payload_bytes.replace(b"100", b"999999999")

    result = deliver(url, tampered_bytes, headers, payload=event)

    assert result.success is False
    assert result.http_status == 403
    assert len(server.received_deliveries) == 0
