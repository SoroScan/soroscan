"""REST API for alert rules (issue #1973)."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from soroscan.ingest.models import AlertExecution, AlertRule
from soroscan.ingest.tests.factories import (
    ContractEventFactory,
    TrackedContractFactory,
    UserFactory,
)

CONDITION = {"op": "and", "conditions": [{"op": "gte", "field": "payload.amount", "value": 100}]}


def make_rule(contract, **kwargs):
    defaults = {
        "name": "Large transfer",
        "condition": CONDITION,
        "action_type": "webhook",
        "action_target": "https://example.com/hook",
    }
    defaults.update(kwargs)
    return AlertRule.objects.create(contract=contract, **defaults)


@pytest.fixture
def owner_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def other_contract():
    return TrackedContractFactory(owner=UserFactory())


def list_url():
    return reverse("alert-rule-list")


def detail_url(rule):
    return reverse("alert-rule-detail", args=[rule.id])


def results(response):
    data = response.json()
    return data["results"] if isinstance(data, dict) and "results" in data else data


@pytest.mark.django_db
class TestAlertRuleCrud:
    def test_requires_authentication(self, api_client):
        assert api_client.get(list_url()).status_code == 401

    def test_create_list_update_delete(self, owner_client, contract):
        payload = {
            "contract": contract.id,
            "name": "Large transfer",
            "condition": CONDITION,
            "action_type": "webhook",
            "action_target": "https://example.com/hook",
        }
        created = owner_client.post(list_url(), payload, format="json")
        assert created.status_code == 201, created.json()
        body = created.json()
        assert body["contract_id"] == contract.contract_id
        assert body["condition"] == CONDITION
        assert body["is_active"] is True

        rule = AlertRule.objects.get(id=body["id"])
        listed = owner_client.get(list_url())
        assert [r["id"] for r in results(listed)] == [rule.id]

        toggled = owner_client.patch(detail_url(rule), {"is_active": False}, format="json")
        assert toggled.status_code == 200
        rule.refresh_from_db()
        assert rule.is_active is False

        assert owner_client.delete(detail_url(rule)).status_code == 204
        assert not AlertRule.objects.filter(id=rule.id).exists()

    def test_channels_can_replace_action_target(self, owner_client, contract):
        response = owner_client.post(
            list_url(),
            {
                "contract": contract.id,
                "name": "Multi-channel",
                "condition": {"op": "eq", "field": "event_type", "value": "transfer"},
                "action_type": "slack",
                "channels": [{"type": "slack", "target": "https://hooks.slack.com/x"}],
            },
            format="json",
        )
        assert response.status_code == 201, response.json()

    def test_filter_by_contract(self, owner_client, user, contract):
        second = TrackedContractFactory(owner=user)
        make_rule(contract)
        rule = make_rule(second)
        response = owner_client.get(list_url(), {"contract": second.id})
        assert [r["id"] for r in results(response)] == [rule.id]


@pytest.mark.django_db
class TestAlertRuleOwnership:
    def test_other_users_rules_are_not_listed(self, owner_client, contract, other_contract):
        mine = make_rule(contract)
        make_rule(other_contract)
        assert [r["id"] for r in results(owner_client.get(list_url()))] == [mine.id]

    def test_other_users_rules_cannot_be_read_edited_or_deleted(self, owner_client, other_contract):
        theirs = make_rule(other_contract)
        assert owner_client.get(detail_url(theirs)).status_code == 404
        assert owner_client.patch(detail_url(theirs), {"is_active": False}, format="json").status_code == 404
        assert owner_client.delete(detail_url(theirs)).status_code == 404
        theirs.refresh_from_db()
        assert theirs.is_active is True

    def test_cannot_create_rule_on_someone_elses_contract(self, owner_client, other_contract):
        response = owner_client.post(
            list_url(),
            {
                "contract": other_contract.id,
                "name": "x",
                "condition": CONDITION,
                "action_type": "email",
                "action_target": "a@example.com",
            },
            format="json",
        )
        assert response.status_code == 400
        assert "contract" in response.json()

    def test_cannot_move_rule_to_someone_elses_contract(self, owner_client, contract, other_contract):
        rule = make_rule(contract)
        response = owner_client.patch(detail_url(rule), {"contract": other_contract.id}, format="json")
        assert response.status_code == 400

    def test_staff_see_all_rules(self, contract, other_contract):
        make_rule(contract)
        make_rule(other_contract)
        client = APIClient()
        client.force_authenticate(user=UserFactory(is_staff=True))
        assert len(results(client.get(list_url()))) == 2


@pytest.mark.django_db
class TestAlertRuleValidation:
    @pytest.mark.parametrize(
        "condition, message",
        [
            ("amount > 5", "non-empty object"),
            ({}, "non-empty object"),
            ({"op": "explode", "field": "x", "value": 1}, "Unknown operator"),
            ({"op": "and", "conditions": []}, "non-empty 'conditions'"),
            ({"op": "eq", "value": 1}, "non-empty 'field'"),
            ({"op": "eq", "field": "x"}, "requires a 'value'"),
            ({"op": "not"}, "nested 'condition'"),
        ],
    )
    def test_invalid_condition_returns_400(self, owner_client, contract, condition, message):
        response = owner_client.post(
            list_url(),
            {
                "contract": contract.id,
                "name": "bad",
                "condition": condition,
                "action_type": "webhook",
                "action_target": "https://example.com/hook",
            },
            format="json",
        )
        assert response.status_code == 400
        assert message in str(response.json()["condition"])

    def test_invalid_action_type_returns_400(self, owner_client, contract):
        response = owner_client.post(
            list_url(),
            {"contract": contract.id, "name": "x", "condition": CONDITION, "action_type": "sms", "action_target": "1"},
            format="json",
        )
        assert response.status_code == 400
        assert "action_type" in response.json()

    def test_requires_a_destination(self, owner_client, contract):
        response = owner_client.post(
            list_url(),
            {"contract": contract.id, "name": "x", "condition": CONDITION, "action_type": "webhook"},
            format="json",
        )
        assert response.status_code == 400
        assert "action_target" in response.json()

    def test_invalid_channel_returns_400(self, owner_client, contract):
        response = owner_client.post(
            list_url(),
            {
                "contract": contract.id,
                "name": "x",
                "condition": CONDITION,
                "action_type": "webhook",
                "channels": [{"type": "pager", "target": "x"}],
            },
            format="json",
        )
        assert response.status_code == 400
        assert "channels" in response.json()


@pytest.mark.django_db
class TestAlertRuleExecutions:
    def test_lists_execution_history_newest_first(self, owner_client, contract):
        rule = make_rule(contract)
        event = ContractEventFactory(contract=contract)
        AlertExecution.objects.create(rule=rule, event=event, channel="webhook", status="failed", response="500")
        latest = AlertExecution.objects.create(rule=rule, event=event, channel="webhook", status="sent")
        response = owner_client.get(reverse("alert-rule-executions", args=[rule.id]))
        assert response.status_code == 200
        rows = results(response)
        assert [r["id"] for r in rows][0] == latest.id
        assert rows[0]["status"] == "sent"
        assert rows[0]["event_type"] == event.event_type

    def test_other_users_executions_are_hidden(self, owner_client, other_contract):
        rule = make_rule(other_contract)
        assert owner_client.get(reverse("alert-rule-executions", args=[rule.id])).status_code == 404

