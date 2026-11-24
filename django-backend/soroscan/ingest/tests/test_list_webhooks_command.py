import pytest
from io import StringIO
from django.core.management import call_command

from soroscan.ingest.models import WebhookSubscription
from soroscan.ingest.tests.factories import (
    ContractEventFactory,
    WebhookSubscriptionFactory,
)


@pytest.mark.django_db
class TestListWebhooksCommand:
    def _call(self, *args, **kwargs):
        out = StringIO()
        call_command("list_webhooks", *args, stdout=out, **kwargs)
        return out.getvalue()

    def test_prints_table_headers(self):
        WebhookSubscriptionFactory()
        output = self._call()
        assert "ID" in output
        assert "URL" in output
        assert "Status" in output
        assert "Event Count" in output

    def test_shows_webhook_data(self):
        wh = WebhookSubscriptionFactory(target_url="https://example.com/hook")
        output = self._call()
        assert str(wh.id) in output
        assert "https://example.com/hook" in output
        assert wh.status in output

    def test_event_count_all_events(self):
        """Webhook with blank event_type counts all contract events."""
        wh = WebhookSubscriptionFactory(event_type="")
        ContractEventFactory(contract=wh.contract, event_type="transfer")
        ContractEventFactory(contract=wh.contract, event_type="swap")
        output = self._call()
        assert "2" in output

    def test_event_count_filtered_by_event_type(self):
        """Webhook with specific event_type only counts matching events."""
        wh = WebhookSubscriptionFactory(event_type="transfer")
        ContractEventFactory(contract=wh.contract, event_type="transfer")
        ContractEventFactory(contract=wh.contract, event_type="swap")
        output = self._call()
        assert "1" in output

    def test_no_webhooks_message(self):
        output = self._call()
        assert "No webhooks found." in output

    def test_active_only_excludes_suspended(self):
        WebhookSubscriptionFactory(
            is_active=False, status=WebhookSubscription.STATUS_SUSPENDED
        )
        output = self._call("--active-only")
        assert "No webhooks found." in output

    def test_active_only_includes_active(self):
        wh = WebhookSubscriptionFactory(
            is_active=True, status=WebhookSubscription.STATUS_ACTIVE
        )
        output = self._call("--active-only")
        assert str(wh.id) in output

    def test_without_active_only_shows_all(self):
        active = WebhookSubscriptionFactory(
            is_active=True, status=WebhookSubscription.STATUS_ACTIVE
        )
        suspended = WebhookSubscriptionFactory(
            is_active=False, status=WebhookSubscription.STATUS_SUSPENDED
        )
        output = self._call()
        assert str(active.id) in output
        assert str(suspended.id) in output
