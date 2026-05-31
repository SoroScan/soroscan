import pytest
from rest_framework.test import APIClient
from django.test import override_settings

from rest_framework import status
from django.contrib.auth.models import User
from soroscan.ingest.models import TrackedContract

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user():
    return User.objects.create_user(username="testuser", password="password")

@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client

@pytest.fixture
def test_contract(user):
    return TrackedContract.objects.create(
        contract_id="CAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        name="Test Contract",
        owner=user,
        is_active=True
    )

@pytest.mark.django_db
def test_events_search_throttle(api_client):
    """
    Test that the dynamic endpoint throttle correctly limits requests
    for the events search endpoint based on settings.
    """
    # Override settings to have a very low limit for search
    custom_rates = {
        "anon": "100/minute",
        "user": "100/minute",
        "events_search": "1/minute",
    }
    
    with override_settings(REST_FRAMEWORK={"DEFAULT_THROTTLE_CLASSES": ["soroscan.throttles.DynamicEndpointThrottle"], "DEFAULT_THROTTLE_RATES": custom_rates}):
        # First request should succeed (limit is 1 per minute)
        response1 = api_client.get("/api/ingest/events/search/")
        assert response1.status_code == status.HTTP_200_OK
        
        # Second request should be throttled
        response2 = api_client.get("/api/ingest/events/search/")
        assert response2.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Retry-After" in response2.headers

@pytest.mark.django_db
def test_contract_stats_throttle(auth_client, test_contract):
    """
    Test that the dynamic endpoint throttle correctly limits requests
    for the contract stats endpoint based on settings.
    """
    custom_rates = {
        "anon": "100/minute",
        "user": "100/minute",
        "contract_stats": "1/minute",
    }
    
    with override_settings(REST_FRAMEWORK={"DEFAULT_THROTTLE_CLASSES": ["soroscan.throttles.DynamicEndpointThrottle"], "DEFAULT_THROTTLE_RATES": custom_rates}):
        url = f"/api/ingest/contracts/{test_contract.pk}/stats/"
        
        # First request should succeed
        response1 = auth_client.get(url)
        assert response1.status_code == status.HTTP_200_OK
        
        # Second request should be throttled
        response2 = auth_client.get(url)
        assert response2.status_code == status.HTTP_429_TOO_MANY_REQUESTS
