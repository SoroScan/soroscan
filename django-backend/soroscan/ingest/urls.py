"""
URL patterns for SoroScan ingest API.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ContractEventViewSet,
    TrackedContractViewSet,
    WebhookSubscriptionViewSet,
    health_check,
    record_event_view,
)

router = DefaultRouter()
router.register(r"contracts", TrackedContractViewSet, basename="contract")
router.register(r"events", ContractEventViewSet, basename="event")
router.register(r"webhooks", WebhookSubscriptionViewSet, basename="webhook")

urlpatterns = [
    path("", include(router.urls)),
    path("record/", record_event_view, name="record-event"),
    path("health/", health_check, name="health-check"),
]
