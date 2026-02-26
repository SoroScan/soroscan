"""
URL patterns for SoroScan ingest API.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    APIKeyViewSet,
    ContractEventViewSet,
    ContractInvocationViewSet,
    TrackedContractViewSet,
    contract_event_explorer_view,
    WebhookSubscriptionViewSet,
    contract_timeline_view,
    health_check,
    record_event_view,
)

router = DefaultRouter()
router.register(r"contracts", TrackedContractViewSet, basename="contract")
router.register(r"events", ContractEventViewSet, basename="event")
router.register(r"invocations", ContractInvocationViewSet, basename="invocation")
router.register(r"webhooks", WebhookSubscriptionViewSet, basename="webhook")
router.register(r"api-keys", APIKeyViewSet, basename="apikey")

urlpatterns = [
    path("contracts/<str:contract_id>/timeline/", contract_timeline_view, name="contract-timeline"),
    path(
        "contracts/<str:contract_id>/events/explorer/",
        contract_event_explorer_view,
        name="contract-event-explorer",
    ),
    path(
        "contracts/<str:contract_id>/snapshots/",
        ContractSnapshotViewSet.as_view({"get": "list"}),
        name="contract-snapshots",
    ),
    path(
        "contracts/<str:contract_id>/snapshots/<int:pk>/",
        ContractSnapshotViewSet.as_view({"get": "retrieve"}),
        name="contract-snapshot-detail",
    ),
    path(
        "contracts/<str:contract_id>/state-changes/",
        StateChangeViewSet.as_view({"get": "list"}),
        name="contract-state-changes",
    ),
    path(
        "contracts/<str:contract_id>/state-changes/<int:pk>/",
        StateChangeViewSet.as_view({"get": "retrieve"}),
        name="contract-state-change-detail",
    ),
    path("", include(router.urls)),
    path("record/", record_event_view, name="record-event"),
    path("health/", health_check, name="health-check"),
]
