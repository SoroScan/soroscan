from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from soroscan.ingest.models import EventAggregation, TrackedContract
from soroscan.ingest.tasks import aggregate_event_statistics, detect_event_anomalies

from .factories import ContractEventFactory, TrackedContractFactory, UserFactory

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def contract(user):
    return TrackedContractFactory(owner=user)


@pytest.mark.django_db
class TestEventAggregationModel:
    def test_create_aggregation(self, contract):
        bucket = timezone.now().replace(minute=0, second=0, microsecond=0)
        agg = EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=bucket,
            event_count=42,
        )
        assert agg.event_type == "transfer"
        assert agg.event_count == 42
        assert str(agg) == f"transfer: 42 @ {bucket.isoformat()}"

    def test_unique_together(self, contract):
        bucket = timezone.now().replace(minute=0, second=0, microsecond=0)
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=bucket,
            event_count=10,
        )
        with pytest.raises(Exception):
            EventAggregation.objects.create(
                contract=contract,
                event_type="transfer",
                time_bucket=bucket,
                event_count=20,
            )


@pytest.mark.django_db
class TestAggregateEventStatisticsTask:
    def test_aggregate_empty(self):
        result = aggregate_event_statistics()
        assert result["buckets_created"] == 0
        assert result["buckets_updated"] == 0

    def test_aggregate_with_events(self, contract):
        now = timezone.now()
        bucket = (now - timezone.timedelta(hours=1)).replace(
            minute=0, second=0, microsecond=0
        )
        ContractEventFactory.create_batch(
            5,
            contract=contract,
            event_type="transfer",
            timestamp=bucket + timezone.timedelta(minutes=30),
        )
        ContractEventFactory.create_batch(
            3,
            contract=contract,
            event_type="mint",
            timestamp=bucket + timezone.timedelta(minutes=45),
        )

        result = aggregate_event_statistics()

        assert result["buckets_created"] == 2
        assert EventAggregation.objects.count() == 2

        transfer_agg = EventAggregation.objects.get(
            contract=contract, event_type="transfer"
        )
        assert transfer_agg.event_count == 5

        mint_agg = EventAggregation.objects.get(
            contract=contract, event_type="mint"
        )
        assert mint_agg.event_count == 3


@pytest.mark.django_db
class TestDetectEventAnomaliesTask:
    def test_no_anomalies(self, contract):
        now = timezone.now()
        bucket = now.replace(minute=0, second=0, microsecond=0)
        prev_bucket = bucket - timezone.timedelta(hours=1)
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=prev_bucket,
            event_count=100,
        )
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=bucket,
            event_count=90,
        )

        with patch("soroscan.ingest.tasks.timezone.now", return_value=bucket + timezone.timedelta(hours=1)):
            result = detect_event_anomalies()
        assert result["anomalies_found"] == 0

    def test_anomaly_detected(self, contract):
        now = timezone.now()
        bucket = now.replace(minute=0, second=0, microsecond=0)
        prev_bucket = bucket - timezone.timedelta(hours=1)
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=prev_bucket,
            event_count=100,
        )
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=bucket,
            event_count=10,
        )

        with patch("soroscan.ingest.tasks.timezone.now", return_value=bucket + timezone.timedelta(hours=1)):
            result = detect_event_anomalies()
        assert result["anomalies_found"] == 1
        assert result["anomalies"][0]["drop_pct"] > 50


@pytest.mark.django_db
class TestAnalyticsAPI:
    def test_analytics_event_volume(self, authenticated_client, contract):
        bucket = timezone.now().replace(minute=0, second=0, microsecond=0)
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=bucket,
            event_count=100,
        )

        url = reverse("analytics-list")
        response = authenticated_client.get(
            url,
            {
                "metric": "event_volume",
                "granularity": "daily",
                "range": "7d",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["metric"] == "event_volume"
        assert len(response.data["data"]) >= 1

    def test_analytics_active_contracts(self, authenticated_client, contract):
        bucket = timezone.now().replace(minute=0, second=0, microsecond=0)
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=bucket,
            event_count=100,
        )

        url = reverse("analytics-list")
        response = authenticated_client.get(
            url,
            {
                "metric": "active_contracts",
                "granularity": "daily",
                "range": "7d",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["metric"] == "active_contracts"

    def test_analytics_event_type_breakdown(
        self, authenticated_client, contract
    ):
        bucket = timezone.now().replace(minute=0, second=0, microsecond=0)
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=bucket,
            event_count=100,
        )
        EventAggregation.objects.create(
            contract=contract,
            event_type="mint",
            time_bucket=bucket,
            event_count=50,
        )

        url = reverse("analytics-list")
        response = authenticated_client.get(
            url,
            {
                "metric": "event_type_breakdown",
                "range": "7d",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 2

    def test_analytics_csv_export(self, authenticated_client, contract):
        bucket = timezone.now().replace(minute=0, second=0, microsecond=0)
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=bucket,
            event_count=100,
        )

        url = reverse("analytics-list")
        response = authenticated_client.get(
            url,
            {
                "metric": "event_volume",
                "granularity": "daily",
                "range": "7d",
                "export": "csv",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response["Content-Type"] == "text/csv"
        assert "filename=" in response["Content-Disposition"]

    def test_analytics_json_export(self, authenticated_client, contract):
        bucket = timezone.now().replace(minute=0, second=0, microsecond=0)
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=bucket,
            event_count=100,
        )

        url = reverse("analytics-list")
        response = authenticated_client.get(
            url,
            {
                "metric": "event_volume",
                "granularity": "daily",
                "range": "7d",
                "export": "json",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert "data" in response.data

    def test_analytics_invalid_params(self, authenticated_client):
        url = reverse("analytics-list")
        response = authenticated_client.get(url, {"metric": "invalid"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestAnalyticsOverview:
    def test_overview(self, authenticated_client, contract):
        bucket = timezone.now().replace(minute=0, second=0, microsecond=0)
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=bucket,
            event_count=100,
        )

        url = reverse("analytics-overview")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "total_events_24h" in response.data
        assert "active_contracts_24h" in response.data
        assert "top_event_types" in response.data
        assert "top_contracts" in response.data

    def test_overview_no_data(self, authenticated_client):
        url = reverse("analytics-overview")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_events_24h"] == 0


@pytest.mark.django_db
class TestAnalyticsAnomalies:
    def test_anomalies_endpoint(self, authenticated_client, contract):
        now = timezone.now()
        bucket = now.replace(minute=0, second=0, microsecond=0)
        prev_bucket = bucket - timezone.timedelta(hours=1)
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=prev_bucket,
            event_count=100,
        )
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=bucket,
            event_count=10,
        )

        url = reverse("analytics-anomalies")
        with patch("soroscan.ingest.tasks.detect_event_anomalies", return_value={"anomalies": [{"contract_id": "test", "event_type": "transfer", "current_count": 10, "previous_count": 100, "drop_pct": 90.0}]}):
            response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "anomalies" in response.data


@pytest.mark.django_db
class TestEventAggregationAdmin:
    def test_admin_list_view(self, authenticated_client, contract):
        bucket = timezone.now().replace(minute=0, second=0, microsecond=0)
        EventAggregation.objects.create(
            contract=contract,
            event_type="transfer",
            time_bucket=bucket,
            event_count=100,
        )

        url = reverse("admin:ingest_eventaggregation_changelist")
        response = authenticated_client.get(url)
        assert response.status_code in (200, 302)
