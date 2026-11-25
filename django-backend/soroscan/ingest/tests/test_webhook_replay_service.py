"""Focused coverage for webhook replay service helpers (issue #2009)."""

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from django.utils import timezone as django_timezone

from soroscan.ingest.models import WebhookReplayJob
from soroscan.ingest.services.webhook_replay import (
    _dispatch_one,
    build_event_queryset,
    create_replay_job,
    parse_optional_datetime,
    run_replay_job,
)

from .factories import (
    ContractEventFactory,
    TrackedContractFactory,
    WebhookSubscriptionFactory,
)

EVENT_TIME = datetime(2026, 9, 15, 12, tzinfo=timezone.utc)


@pytest.mark.parametrize("value", [None, ""])
def test_parse_optional_datetime_empty(value):
    assert parse_optional_datetime(value) is None


def test_parse_optional_datetime_iso_and_naive_values():
    assert parse_optional_datetime("2026-09-15T12:00:00Z") == EVENT_TIME
    parsed = parse_optional_datetime("2026-09-15T12:00:00")
    expected_naive = django_timezone.make_aware(datetime(2026, 9, 15, 12))
    assert parsed == expected_naive
    assert django_timezone.is_aware(parsed)


def test_parse_optional_datetime_invalid():
    with pytest.raises(ValueError, match="Invalid datetime"):
        parse_optional_datetime("yesterday-ish")


@pytest.mark.django_db
def test_create_replay_job_validates_contract_and_records_matching_count():
    contract = TrackedContractFactory()
    ContractEventFactory(contract=contract, timestamp=EVENT_TIME, event_type="swap")
    ContractEventFactory(contract=contract, timestamp=EVENT_TIME, event_type="mint")
    webhook = WebhookSubscriptionFactory(contract=contract)

    job = create_replay_job(subscription=webhook, event_type="swap", limit=1)

    assert job.contract_id == contract.contract_id
    assert job.filters["event_type"] == "swap"
    assert job.total_events == 1
    with pytest.raises(ValueError, match="contract_id is required"):
        create_replay_job()


@pytest.mark.django_db
def test_build_event_queryset_applies_type_date_and_limit():
    contract = TrackedContractFactory()
    wanted = ContractEventFactory(contract=contract, timestamp=EVENT_TIME, event_type="swap")
    ContractEventFactory(
        contract=contract,
        timestamp=datetime(2026, 9, 17, tzinfo=timezone.utc),
        event_type="swap",
    )
    ContractEventFactory(contract=contract, timestamp=EVENT_TIME, event_type="mint")

    events = list(
        build_event_queryset(
            contract_id=contract.contract_id,
            event_type="swap",
            from_date="2026-09-15T00:00:00Z",
            to_date="2026-09-16T00:00:00Z",
            limit=1,
        )
    )

    assert [event.pk for event in events] == [wanted.pk]


@pytest.mark.django_db
@pytest.mark.parametrize("status", [WebhookReplayJob.STATUS_COMPLETED, WebhookReplayJob.STATUS_CANCELLED])
def test_run_replay_job_returns_completed_or_cancelled_job_unchanged(webhook_job_factory, status):
    job = webhook_job_factory(status=status)
    with patch("soroscan.ingest.services.webhook_replay._dispatch_one") as dispatch:
        result = run_replay_job(job.pk)
    assert result["status"] == status
    dispatch.assert_not_called()


@pytest.fixture
def webhook_job_factory(db):
    def make_job(*, status=WebhookReplayJob.STATUS_PENDING, filters=None, rate=2.0):
        contract = TrackedContractFactory()
        webhook = WebhookSubscriptionFactory(contract=contract, event_type="")
        return WebhookReplayJob.objects.create(
            subscription=webhook,
            contract_id=contract.contract_id,
            filters=filters or {},
            rate_limit_per_second=rate,
            status=status,
        )

    return make_job


@pytest.mark.django_db
def test_run_replay_job_filters_events_and_tracks_partial_failure(webhook_job_factory):
    job = webhook_job_factory(
        filters={
            "event_type": "swap",
            "from_date": "2026-09-15T00:00:00Z",
            "to_date": "2026-09-16T00:00:00Z",
        }
    )
    contract = job.subscription.contract
    event = ContractEventFactory(contract=contract, timestamp=EVENT_TIME, event_type="swap")
    successful_event = ContractEventFactory(
        contract=contract, timestamp=EVENT_TIME, event_type="swap"
    )
    ContractEventFactory(contract=contract, timestamp=EVENT_TIME, event_type="mint")
    ContractEventFactory(
        contract=contract,
        timestamp=datetime(2026, 9, 17, tzinfo=timezone.utc),
        event_type="swap",
    )

    with patch(
        "soroscan.ingest.services.webhook_replay._dispatch_one",
        side_effect=[
            {"event_id": event.pk, "success": False, "status": "error", "error": "offline"},
            {"event_id": successful_event.pk, "success": True, "status": "success"},
        ],
    ) as dispatch, patch("soroscan.ingest.services.webhook_replay.time.sleep") as sleep:
        result = run_replay_job(job.pk)

    assert dispatch.call_args_list == [
        ((job.subscription, event), {"dry_run": False}),
        ((job.subscription, successful_event), {"dry_run": False}),
    ]
    assert sleep.call_args_list == [((0.5,), {}), ((0.5,), {})]
    assert result["status"] == WebhookReplayJob.STATUS_COMPLETED
    assert result["total_events"] == 2
    assert result["processed_events"] == 2
    assert result["succeeded"] == 1
    assert result["failed"] == 1
    assert result["result"]["summary"] == {
        "events_processed": 2,
        "successes": 1,
        "failures": 1,
        "skipped": 0,
    }


@pytest.mark.django_db
def test_run_replay_job_success_and_dry_run_do_not_sleep(webhook_job_factory):
    job = webhook_job_factory(rate=5, filters={"event_type": "swap"})
    event = ContractEventFactory(
        contract=job.subscription.contract, timestamp=EVENT_TIME, event_type="swap"
    )
    job.dry_run = True
    job.save(update_fields=["dry_run"])
    with patch(
        "soroscan.ingest.services.webhook_replay._dispatch_one",
        return_value={"event_id": event.pk, "success": True, "status": "dry-run"},
    ) as dispatch, patch("soroscan.ingest.services.webhook_replay.time.sleep") as sleep:
        result = run_replay_job(job.pk)
    dispatch.assert_called_once_with(job.subscription, event, dry_run=True)
    sleep.assert_not_called()
    assert result["status"] == WebhookReplayJob.STATUS_COMPLETED
    assert result["succeeded"] == 1


@pytest.mark.django_db
def test_dispatch_one_dry_run_does_not_invoke_celery(webhook_job_factory):
    job = webhook_job_factory()
    event = ContractEventFactory(contract=job.subscription.contract, timestamp=EVENT_TIME)
    result = _dispatch_one(job.subscription, event, dry_run=True)
    assert result == {
        "event_id": event.pk,
        "webhook_id": job.subscription.pk,
        "status": "dry-run",
        "success": True,
    }


@pytest.mark.django_db
@pytest.mark.parametrize(
    "task_result, expected",
    [
        (type("Success", (), {"successful": lambda self: True})(), "success"),
        (type("Failure", (), {"successful": lambda self: False, "result": "nope"})(), "failed"),
    ],
)
def test_dispatch_one_reports_celery_result(webhook_job_factory, task_result, expected):
    job = webhook_job_factory()
    event = ContractEventFactory(contract=job.subscription.contract, timestamp=EVENT_TIME)
    with patch("soroscan.ingest.tasks.dispatch_webhook.apply", return_value=task_result) as apply:
        result = _dispatch_one(job.subscription, event, dry_run=False)
    apply.assert_called_once_with(args=[job.subscription.pk, event.pk])
    assert result["status"] == expected
    assert result["success"] is (expected == "success")
    if expected == "failed":
        assert result["error"] == "nope"


@pytest.mark.django_db
def test_dispatch_one_captures_celery_exception(webhook_job_factory):
    job = webhook_job_factory()
    event = ContractEventFactory(contract=job.subscription.contract, timestamp=EVENT_TIME)
    with patch(
        "soroscan.ingest.tasks.dispatch_webhook.apply", side_effect=RuntimeError("broker down")
    ):
        result = _dispatch_one(job.subscription, event, dry_run=False)
    assert result["status"] == "error"
    assert result["success"] is False
    assert result["error"] == "broker down"
