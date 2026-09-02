from django.urls import path

from . import views

urlpatterns = [
    path("events", views.list_events, name="v1-events"),
    path("contracts/<str:contract_id>", views.get_contract, name="v1-contract-detail"),
    path("webhooks/dead-letters/bulk-replay", views.bulk_replay_dead_letters, name="v1-webhook-bulk-replay"),
]
