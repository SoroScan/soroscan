"""
Tests for the ping_webhook Celery task (issue #403).
"""
import json

import pytest
import requests
import responses as responses_lib

from soroscan.ingest.tasks import ping_webhook
from soroscan.ingest.tests.factories import TrackedContractFactory, WebhookSubscriptionFactory


@pytest.mark.django_db
class TestPingWebhookTask:
    def test_ping_success_on_200(self):
        contract = TrackedContractFactory()
        webhook = WebhookSubscriptionFactory(contract=contract)

        with responses_lib.RequestsMock() as rsps:
            rsps.add(responses_lib.POST, webhook.target_url, status=200)
            result = ping_webhook.run(webhook.id)

        assert result["success"] is True
        assert result["status_code"] == 200

    def test_ping_failure_on_non_200(self):
        contract = TrackedContractFactory()
        webhook = WebhookSubscriptionFactory(contract=contract)

        with responses_lib.RequestsMock() as rsps:
            rsps.add(responses_lib.POST, webhook.target_url, status=503)
            result = ping_webhook.run(webhook.id)

        assert result["success"] is False
        assert result["status_code"] == 503

    def test_ping_sends_correct_payload(self):
        contract = TrackedContractFactory()
        webhook = WebhookSubscriptionFactory(contract=contract)

        with responses_lib.RequestsMock() as rsps:
            rsps.add(responses_lib.POST, webhook.target_url, status=200)
            ping_webhook.run(webhook.id)
            request_body = json.loads(rsps.calls[0].request.body)

        assert request_body["type"] == "ping"
        assert "timestamp" in request_body

    def test_ping_sends_correct_content_type_header(self):
        contract = TrackedContractFactory()
        webhook = WebhookSubscriptionFactory(contract=contract)

        with responses_lib.RequestsMock() as rsps:
            rsps.add(responses_lib.POST, webhook.target_url, status=200)
            ping_webhook.run(webhook.id)
            content_type = rsps.calls[0].request.headers["Content-Type"]

        assert content_type == "application/json"

    def test_ping_returns_error_for_missing_subscription(self):
        result = ping_webhook.run(999999)

        assert result["success"] is False
        assert "error" in result

    def test_ping_handles_connection_error(self):
        contract = TrackedContractFactory()
        webhook = WebhookSubscriptionFactory(contract=contract)

        with responses_lib.RequestsMock() as rsps:
            rsps.add(
                responses_lib.POST,
                webhook.target_url,
                body=requests.exceptions.ConnectionError("connection refused"),
            )
            result = ping_webhook.run(webhook.id)

        assert result["success"] is False
        assert "error" in result
